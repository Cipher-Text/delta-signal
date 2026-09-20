export const SOCIAL_PUBLISH_QUEUE = 'social-publish';

/** Job sent once per publish request; the processor loads everything else by id. */
export interface PublishJobData {
  socialPublicationId: string;
}
