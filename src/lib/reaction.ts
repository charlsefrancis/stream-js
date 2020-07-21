import StreamClient, { APIResponse } from './client';
import StreamFeed from './feed';
import errors from './errors';

type Activity<T = Record<string, unknown>> = T & {
  id: string;
};

type Reaction<T = Record<string, unknown>> = T & {
  id: string;
};

type TargetFeeds = (string | StreamFeed)[];

type TargetFeed = string | StreamFeed;

type TargetFeedsExtraData = {
  [key: string]: unknown;
};

type ReactionBody<T> = {
  id?: string;
  activity_id?: string | { id: string };
  parent?: string | { id: string };
  kind?: string;
  data?: T | Record<string, unknown>;
  target_feeds?: TargetFeeds;
  user_id?: string;
  target_feeds_extra_data?: TargetFeedsExtraData;
};

type ReactionAPIResponse<T> = APIResponse & {
  id: string;
  kind: string;
  activity_id: string;
  user_id: string;
  data: T;
  created_at: Date;
  updated_at: Date;
  user?: unknown;
  latest_children?: {
    [key: string]: unknown;
  };
  children_counts?: {
    [key: string]: number;
  };
};

type ChildReactionAPIResponse<T> = ReactionAPIResponse<T> & {
  parent: string;
};

type ReactionFilterAPIResponse<T, A> = APIResponse & {
  results: ReactionAPIResponse<T>[] | ChildReactionAPIResponse<T>[];
  activity: A;
  next: string;
};

export default class StreamReaction {
  client: StreamClient;
  token: string;

  constructor(client: StreamClient, token: string) {
    /**
     * Initialize a reaction object
     * @method constructor
     * @memberof StreamReaction.prototype
     * @param {StreamClient} client Stream client this feed is constructed from
     * @param {string} token JWT token
     * @example new StreamReaction(client, "eyJhbGciOiJIUzI1...")
     */
    this.client = client;
    this.token = token;
  }

  buildURL = (...args: string[]): string => {
    return `${['reaction', ...args].join('/')}/`;
  };

  all(options = {}): Promise<unknown> {
    /**
     * get all reactions
     * @method all
     * @memberof StreamReaction.prototype
     * @param  {object}   options  {limit:}
     * @return {Promise} Promise object
     * @example reactions.all()
     * @example reactions.all({limit:100})
     */
    return this.client.get({
      url: this.buildURL(),
      signature: this.token,
      qs: options,
    });
  }

  _convertTargetFeeds = (targetFeeds: TargetFeeds = []): string[] => {
    return targetFeeds.map((elem: TargetFeed) => (typeof elem === 'string' ? elem : (elem as StreamFeed).id));
  };

  add<T>(
    kind: string,
    activity: string | Activity,
    data: T,
    {
      id,
      targetFeeds = [],
      userId,
      targetFeedsExtraData,
    }: { id?: string; targetFeeds?: TargetFeeds; userId?: string; targetFeedsExtraData?: TargetFeedsExtraData } = {},
  ): Promise<ReactionAPIResponse<T>> {
    /**
     * add reaction
     * @method add
     * @memberof StreamReaction.prototype
     * @param  {string}   kind  kind of reaction
     * @param  {string}   activity Activity or an ActivityID
     * @param  {object}   data  data related to reaction
     * @param  {array}    targetFeeds  an array of feeds to which to send an activity with the reaction
     * @return {Promise} Promise object
     * @example reactions.add("like", "0c7db91c-67f9-11e8-bcd9-fe00a9219401")
     * @example reactions.add("comment", "0c7db91c-67f9-11e8-bcd9-fe00a9219401", {"text": "love it!"},)
     */
    const body: ReactionBody<T> = {
      id,
      activity_id: activity instanceof Object ? (activity as Activity).id : activity,
      kind,
      data: data || {},
      target_feeds: this._convertTargetFeeds(targetFeeds),
      user_id: userId,
    };
    if (targetFeedsExtraData != null) {
      body.target_feeds_extra_data = targetFeedsExtraData;
    }
    return this.client.post<ReactionAPIResponse<T>>({
      url: this.buildURL(),
      body,
      signature: this.token,
    });
  }

  addChild<T>(
    kind: string,
    reaction: string | Reaction,
    data = {},
    {
      targetFeeds = [],
      userId,
      targetFeedsExtraData,
    }: {
      targetFeeds?: TargetFeeds;
      userId?: string;
      targetFeedsExtraData?: TargetFeedsExtraData;
    } = {},
  ): Promise<ChildReactionAPIResponse<T>> {
    /**
     * add reaction
     * @method add
     * @memberof StreamReaction.prototype
     * @param  {string}   kind  kind of reaction
     * @param  {string}   reaction Reaction or a ReactionID
     * @param  {object}   data  data related to reaction
     * @param  {array}    targetFeeds  an array of feeds to which to send an activity with the reaction
     * @return {Promise} Promise object
     * @example reactions.add("like", "0c7db91c-67f9-11e8-bcd9-fe00a9219401")
     * @example reactions.add("comment", "0c7db91c-67f9-11e8-bcd9-fe00a9219401", {"text": "love it!"},)
     */
    const body: ReactionBody<T> = {
      parent: reaction instanceof Object ? (reaction as Reaction).id : reaction,
      kind,
      data,
      target_feeds: this._convertTargetFeeds(targetFeeds),
      user_id: userId,
    };
    if (targetFeedsExtraData != null) {
      body.target_feeds_extra_data = targetFeedsExtraData;
    }
    return this.client.post<ChildReactionAPIResponse<T>>({
      url: this.buildURL(),
      body,
      signature: this.token,
    });
  }

  get<T>(id: string): Promise<ReactionAPIResponse<T> | ChildReactionAPIResponse<T>> {
    /**
     * get reaction
     * @method add
     * @memberof StreamReaction.prototype
     * @param  {string}   id Reaction Id
     * @return {Promise} Promise object
     * @example reactions.get("67b3e3b5-b201-4697-96ac-482eb14f88ec")
     */
    return this.client.get<ReactionAPIResponse<T> | ChildReactionAPIResponse<T>>({
      url: this.buildURL(id),
      signature: this.token,
    });
  }

  filter<T, A>(conditions: {
    kind?: string;
    user_id?: string;
    activity_id?: string;
    reaction_id?: string;
    id_lt?: string;
    id_lte?: string;
    id_gt?: string;
    id_gte?: string;
    limit?: number;
    with_activity_data?: boolean;
  }): Promise<ReactionFilterAPIResponse<T, A>> {
    /**
     * retrieve reactions by activity_id, user_id or reaction_id (to paginate children reactions), pagination can be done using id_lt, id_lte, id_gt and id_gte parameters
     * id_lt and id_lte return reactions order by creation descending starting from the reaction with the ID provided, when id_lte is used
     * the reaction with ID equal to the value provided is included.
     * id_gt and id_gte return reactions order by creation ascending (oldest to newest) starting from the reaction with the ID provided, when id_gte is used
     * the reaction with ID equal to the value provided is included.
     * results are limited to 25 at most and are ordered newest to oldest by default.
     * @method filter
     * @memberof StreamReaction.prototype
     * @param  {object}   conditions Reaction Id {activity_id|user_id|reaction_id:string, kind:string, limit:integer}
     * @return {Promise} Promise object
     * @example reactions.filter({activity_id: "0c7db91c-67f9-11e8-bcd9-fe00a9219401", kind:"like"})
     * @example reactions.filter({user_id: "john", kinds:"like"})
     */

    const { user_id: userId, activity_id: activityId, reaction_id: reactionId, ...qs } = conditions;
    if (!qs.limit) {
      qs.limit = 10;
    }

    if ((userId ? 1 : 0) + (activityId ? 1 : 0) + (reactionId ? 1 : 0) !== 1) {
      throw new errors.SiteError(
        'Must provide exactly one value for one of these params: user_id, activity_id, reaction_id',
      );
    }

    const lookupType = (userId && 'user_id') || (activityId && 'activity_id') || (reactionId && 'reaction_id');
    const value = userId || activityId || reactionId;

    const url = conditions.kind
      ? this.buildURL(lookupType as string, value as string, conditions.kind)
      : this.buildURL(lookupType as string, value as string);

    return this.client.get<ReactionFilterAPIResponse<T, A>>({
      url,
      qs: qs as { [key: string]: unknown },
      signature: this.token,
    });
  }

  update<T>(
    id: string,
    data: T,
    {
      targetFeeds = [],
      targetFeedsExtraData,
    }: { targetFeeds?: string[] | StreamFeed[]; targetFeedsExtraData?: TargetFeedsExtraData } = {},
  ): Promise<ReactionAPIResponse<T> | ChildReactionAPIResponse<T>> {
    /**
     * update reaction
     * @method add
     * @memberof StreamReaction.prototype
     * @param  {string}   id Reaction Id
     * @param  {object}   data  Data associated to reaction
     * @param  {array}   targetFeeds  Optional feeds to post the activity to. If you sent this before and don't set it here it will be removed.
     * @return {Promise} Promise object
     * @example reactions.update("67b3e3b5-b201-4697-96ac-482eb14f88ec", "0c7db91c-67f9-11e8-bcd9-fe00a9219401", "like")
     * @example reactions.update("67b3e3b5-b201-4697-96ac-482eb14f88ec", "0c7db91c-67f9-11e8-bcd9-fe00a9219401", "comment", {"text": "love it!"},)
     */
    const body: ReactionBody<T> = {
      data,
      target_feeds: this._convertTargetFeeds(targetFeeds),
    };
    if (targetFeedsExtraData != null) {
      body.target_feeds_extra_data = targetFeedsExtraData;
    }
    return this.client.put<ReactionAPIResponse<T> | ChildReactionAPIResponse<T>>({
      url: this.buildURL(id),
      body,
      signature: this.token,
    });
  }

  delete(id: string): Promise<APIResponse> {
    /**
     * delete reaction
     * @method delete
     * @memberof StreamReaction.prototype
     * @param  {string}   id Reaction Id
     * @return {Promise} Promise object
     * @example reactions.delete("67b3e3b5-b201-4697-96ac-482eb14f88ec")
     */
    return this.client.delete<APIResponse>({
      url: this.buildURL(id),
      signature: this.token,
    });
  }
}
