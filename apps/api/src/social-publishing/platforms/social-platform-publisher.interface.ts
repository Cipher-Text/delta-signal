export interface PublishParams {
  /** Decrypted, platform-specific access token (e.g. a Facebook Page Access Token). */
  accessToken: string;
  /** Platform-specific target id (e.g. a Facebook Page id). */
  externalAccountId: string;
  /** Publicly reachable URL of the rasterized PNG card. */
  imageUrl: string;
  caption: string;
}

export interface PublishResult {
  externalPostId: string;
  externalUrl: string;
}

export interface SocialPlatformPublisher {
  publish(params: PublishParams): Promise<PublishResult>;
}
