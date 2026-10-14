import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CommunityService } from './community.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreatePostCommentDto } from './dto/create-comment.dto';
import { CastVoteDto } from './dto/cast-vote.dto';

@Controller('community')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('posts')
  listPosts(
    @Query('districtId') districtId?: string,
    @Query('hasPoll') hasPoll?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const hasPollFilter =
      hasPoll === 'true' ? true : hasPoll === 'false' ? false : undefined;
    return this.communityService.listPosts(
      districtId,
      hasPollFilter,
      Number(page ?? 1),
      Number(pageSize ?? 20),
      user?.sub,
    );
  }

  @Post('posts')
  createPost(@Body() dto: CreatePostDto, @CurrentUser() user: JwtPayload) {
    return this.communityService.createPost(dto, user);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('posts/:id')
  async getPost(@Param('id') id: string, @CurrentUser() user?: JwtPayload) {
    const post = await this.communityService.getPost(id);
    if (!post.poll) return post;

    // Inject the caller's voted option if authenticated
    const userVotedOptionId = user
      ? (await this.communityService.getUserVote(post.poll.id, user.sub))?.optionId ?? null
      : null;

    return {
      ...post,
      poll: { ...post.poll, userVotedOptionId },
    };
  }

  @Delete('posts/:id')
  @HttpCode(204)
  deletePost(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.communityService.deletePost(id, user);
  }

  @Post('posts/:id/comments')
  addComment(
    @Param('id') postId: string,
    @Body() dto: CreatePostCommentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.communityService.addComment(postId, dto, user);
  }

  @Delete('posts/:id/comments/:commentId')
  @HttpCode(204)
  deleteComment(
    @Param('id') postId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.communityService.deleteComment(postId, commentId, user);
  }

  @Post('posts/:id/poll/vote')
  castVote(
    @Param('id') postId: string,
    @Body() dto: CastVoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.communityService.castVote(postId, dto, user);
  }
}
