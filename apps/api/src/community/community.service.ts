import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { clampPagination } from '../common/pagination';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { CreatePostDto } from './dto/create-post.dto';
import { CreatePostCommentDto } from './dto/create-comment.dto';
import { CastVoteDto } from './dto/cast-vote.dto';
import { GamificationService } from '../gamification/gamification.service';

const POST_LIST_SELECT = {
  id: true,
  title: true,
  body: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, displayName: true } },
  district: { select: { id: true, name: true } },
  _count: { select: { comments: true } },
  poll: {
    select: {
      id:       true,
      question: true,
      endsAt:   true,
      options:  { select: { _count: { select: { votes: true } } } },
    },
  },
} as const;

const COMMENT_SELECT = {
  id: true,
  body: true,
  createdAt: true,
  author: { select: { id: true, displayName: true } },
} as const;

const OPTION_WITH_COUNT_SELECT = {
  id: true,
  text: true,
  order: true,
  _count: { select: { votes: true } },
} as const;

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
  ) {}

  listPosts(
    districtId: string | undefined,
    hasPoll: boolean | undefined,
    rawPage: number,
    rawPageSize: number,
  ) {
    const { page, pageSize } = clampPagination(rawPage, rawPageSize);
    const skip = (page - 1) * pageSize;
    const where = {
      ...(districtId ? { districtId } : {}),
      ...(hasPoll === true  ? { poll: { isNot: null } } : {}),
      ...(hasPoll === false ? { poll: { is:    null } } : {}),
    };
    return Promise.all([
      this.prisma.communityPost.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: POST_LIST_SELECT,
      }),
      this.prisma.communityPost.count({ where }),
    ]).then(([data, total]) => ({ data, total, page, pageSize }));
  }

  async createPost(dto: CreatePostDto, actor: JwtPayload) {
    if (dto.poll && actor.role !== 'ADMIN' && actor.role !== 'MODERATOR') {
      throw new ForbiddenException('Only moderators and admins can create polls');
    }

    if (dto.districtId) {
      const district = await this.prisma.district.findUnique({ where: { id: dto.districtId } });
      if (!district) throw new NotFoundException('District not found');
    }

    const post = await this.prisma.$transaction(async (tx) => {
      const created = await tx.communityPost.create({
        data: {
          title: dto.title,
          body: dto.body ?? '',
          authorId: actor.sub,
          ...(dto.districtId ? { districtId: dto.districtId } : {}),
          ...(dto.poll
            ? {
                poll: {
                  create: {
                    question: dto.poll.question,
                    ...(dto.poll.endsAt ? { endsAt: new Date(dto.poll.endsAt) } : {}),
                    options: {
                      createMany: {
                        data: dto.poll.options.map((text, i) => ({ text, order: i })),
                      },
                    },
                  },
                },
              }
            : {}),
        },
        select: POST_LIST_SELECT,
      });

      await tx.auditEvent.create({
        data: {
          action: AuditAction.COMMUNITY_POST_CREATE,
          userId: actor.sub,
          entityType: 'CommunityPost',
          entityId: created.id,
        },
      });

      return created;
    });

    this.gamification.evaluateBadges(actor.sub).catch((err: unknown) => {
      this.logger.warn(`Badge evaluation failed after post create: ${String(err)}`);
    });

    return post;
  }

  async getPost(id: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id },
      select: {
        ...POST_LIST_SELECT,
        comments: {
          select: COMMENT_SELECT,
          orderBy: { createdAt: 'asc' },
        },
        poll: {
          select: {
            id: true,
            question: true,
            endsAt: true,
            createdAt: true,
            options: {
              select: OPTION_WITH_COUNT_SELECT,
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async deletePost(id: string, actor: JwtPayload) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    if (actor.role !== 'ADMIN' && actor.role !== 'MODERATOR' && post.authorId !== actor.sub) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.communityPost.delete({ where: { id } });
      await tx.auditEvent.create({
        data: {
          action: AuditAction.COMMUNITY_POST_DELETE,
          userId: actor.sub,
          entityType: 'CommunityPost',
          entityId: id,
        },
      });
    });
  }

  async addComment(postId: string, dto: CreatePostCommentDto, actor: JwtPayload) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post not found');

    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.postComment.create({
        data: { postId, authorId: actor.sub, body: dto.body },
        select: COMMENT_SELECT,
      });
      await tx.auditEvent.create({
        data: {
          action: AuditAction.COMMUNITY_COMMENT_ADD,
          userId: actor.sub,
          entityType: 'PostComment',
          entityId: created.id,
          meta: { postId },
        },
      });
      return created;
    });

    this.gamification.evaluateBadges(actor.sub).catch((err: unknown) => {
      this.logger.warn(`Badge evaluation failed after comment add: ${String(err)}`);
    });

    return comment;
  }

  async deleteComment(postId: string, commentId: string, actor: JwtPayload) {
    const comment = await this.prisma.postComment.findUnique({
      where: { id: commentId },
      select: { authorId: true, postId: true },
    });
    if (!comment || comment.postId !== postId) throw new NotFoundException('Comment not found');
    if (actor.role !== 'ADMIN' && actor.role !== 'MODERATOR' && comment.authorId !== actor.sub) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.postComment.delete({ where: { id: commentId } });
      await tx.auditEvent.create({
        data: {
          action: AuditAction.COMMUNITY_COMMENT_DELETE,
          userId: actor.sub,
          entityType: 'PostComment',
          entityId: commentId,
          meta: { postId },
        },
      });
    });
  }

  async castVote(postId: string, dto: CastVoteDto, actor: JwtPayload) {
    const poll = await this.prisma.poll.findUnique({
      where: { postId },
      select: { id: true, endsAt: true },
    });
    if (!poll) throw new NotFoundException('This post has no poll');

    if (poll.endsAt && new Date() > poll.endsAt) {
      throw new ForbiddenException('This poll has ended');
    }

    const option = await this.prisma.pollOption.findFirst({
      where: { id: dto.optionId, pollId: poll.id },
      select: { id: true },
    });
    if (!option) throw new BadRequestException('Option does not belong to this poll');

    return this.prisma.$transaction(async (tx) => {
      await tx.pollVote.upsert({
        where: { pollId_userId: { pollId: poll.id, userId: actor.sub } },
        update: { optionId: dto.optionId },
        create: { pollId: poll.id, optionId: dto.optionId, userId: actor.sub },
      });
      await tx.auditEvent.create({
        data: {
          action: AuditAction.COMMUNITY_POLL_VOTE,
          userId: actor.sub,
          entityType: 'Poll',
          entityId: poll.id,
          meta: { postId, optionId: dto.optionId },
        },
      });
      // Return updated option counts
      return tx.pollOption.findMany({
        where: { pollId: poll.id },
        select: OPTION_WITH_COUNT_SELECT,
        orderBy: { order: 'asc' },
      });
    });
  }

  async getUserVote(pollId: string, userId: string) {
    return this.prisma.pollVote.findUnique({
      where: { pollId_userId: { pollId, userId } },
      select: { optionId: true },
    });
  }
}
