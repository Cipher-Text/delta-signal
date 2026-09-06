'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { routes } from '@delta-signal/contracts';
import { apiPostAuthed, apiDeleteAuthed, ApiError } from './api';
import { ACCESS_TOKEN_COOKIE } from './session-constants';

export async function createPostAction(formData: FormData) {
  const accessToken = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');

  const rawTitle = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim() || undefined;
  const districtId = formData.get('districtId') ? String(formData.get('districtId')) : undefined;
  const pollQuestion = formData.get('pollQuestion') ? String(formData.get('pollQuestion')).trim() : undefined;

  // On the polls tab the title field is hidden — derive it from the question
  const title = rawTitle || (pollQuestion ? pollQuestion.slice(0, 300) : '');

  // Collect poll fields only when a question is provided
  let poll: { question: string; options: string[]; endsAt?: string } | undefined;
  if (pollQuestion) {
    const options = [0, 1, 2, 3]
      .map((i) => String(formData.get(`pollOption${i}`) ?? '').trim())
      .filter(Boolean);
    if (options.length >= 2) {
      const pollEndsAt = formData.get('pollEndsAt')
        ? String(formData.get('pollEndsAt'))
        : undefined;
      poll = {
        question: pollQuestion,
        options,
        ...(pollEndsAt ? { endsAt: new Date(pollEndsAt).toISOString() } : {}),
      };
    }
  }

  // Determine which tab to redirect back to
  const redirectTab = poll ? 'polls' : 'posts';

  try {
    await apiPostAuthed<unknown>(
      routes.community.createPost,
      { title, body, districtId, poll },
      accessToken,
    );
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to create post';
    redirect(`/community?tab=${redirectTab}&error=${encodeURIComponent(message)}`);
  }

  redirect(`/community?tab=${redirectTab}&created=1`);
}

export async function addPostCommentAction(postId: string, formData: FormData) {
  const accessToken = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');

  const body = String(formData.get('body') ?? '').trim();

  try {
    await apiPostAuthed<unknown>(routes.community.addComment(postId), { body }, accessToken);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to post comment';
    redirect(`/community/${postId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/community/${postId}?commented=1`);
}

export async function deletePostAction(postId: string, hasPoll: boolean) {
  const accessToken = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');

  try {
    await apiDeleteAuthed(routes.community.deletePost(postId), accessToken);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to delete post';
    redirect(`/community/${postId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/community?tab=${hasPoll ? 'polls' : 'posts'}&deleted=1`);
}

export async function deleteCommentAction(postId: string, commentId: string) {
  const accessToken = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');

  try {
    await apiDeleteAuthed(routes.community.deleteComment(postId, commentId), accessToken);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to delete comment';
    redirect(`/community/${postId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/community/${postId}?commentDeleted=1`);
}

export async function castVoteAction(postId: string, formData: FormData) {
  const accessToken = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) redirect('/login');

  const optionId = String(formData.get('optionId') ?? '');

  try {
    await apiPostAuthed<unknown>(routes.community.vote(postId), { optionId }, accessToken);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to cast vote';
    redirect(`/community/${postId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/community/${postId}?voted=1`);
}
