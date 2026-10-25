CREATE TABLE "airports" (
	"iata" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city_name" text NOT NULL,
	"country_iso" text NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"size" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_events" (
	"id" text PRIMARY KEY NOT NULL,
	"alert_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"price_cents" integer NOT NULL,
	"previous_price_cents" integer,
	"change_pct" real,
	"reason" text NOT NULL,
	"offer" jsonb NOT NULL,
	"is_demo" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"criteria" jsonb NOT NULL,
	"max_price_cents" integer,
	"drop_pct" smallint,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"check_every_minutes" integer DEFAULT 360 NOT NULL,
	"channels" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"reference_price_cents" integer,
	"last_price_cents" integer,
	"last_checked_at" timestamp with time zone,
	"last_notified_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_usage" (
	"source_id" text NOT NULL,
	"day" date NOT NULL,
	"requests" integer DEFAULT 0 NOT NULL,
	"errors" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "api_usage_source_id_day_pk" PRIMARY KEY("source_id","day")
);
--> statement-breakpoint
CREATE TABLE "cache_entries" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"slug" text PRIMARY KEY NOT NULL,
	"country_iso" text NOT NULL,
	"name_fr" text NOT NULL,
	"name_en" text NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"time_zone" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "climate_normals" (
	"destination_slug" text NOT NULL,
	"month" smallint NOT NULL,
	"tmax_c" real NOT NULL,
	"tmin_c" real NOT NULL,
	"precip_mm" real NOT NULL,
	"source_id" text NOT NULL,
	"period" text NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	CONSTRAINT "climate_normals_destination_slug_month_source_id_pk" PRIMARY KEY("destination_slug","month","source_id"),
	CONSTRAINT "month_range" CHECK ("climate_normals"."month" between 1 and 12)
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"tip_id" text NOT NULL,
	"author_id" text NOT NULL,
	"parent_id" text,
	"body" text NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"iso2" text PRIMARY KEY NOT NULL,
	"name_fr" text NOT NULL,
	"name_en" text NOT NULL,
	"continent" text NOT NULL,
	"currency" text
);
--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"url" text NOT NULL,
	"license" text NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"last_success_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE "destinations" (
	"slug" text PRIMARY KEY NOT NULL,
	"city_slug" text,
	"country_iso" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"data_version" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flight_offers" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"external_id" text NOT NULL,
	"comparable_key" text NOT NULL,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"depart_date" date NOT NULL,
	"return_date" date,
	"cabin" text NOT NULL,
	"passengers" smallint NOT NULL,
	"total_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"payload" jsonb NOT NULL,
	"is_demo" boolean NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"follower_id" text NOT NULL,
	"followee_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_id_followee_id_pk" PRIMARY KEY("follower_id","followee_id"),
	CONSTRAINT "no_self_follow" CHECK ("follows"."follower_id" <> "follows"."followee_id")
);
--> statement-breakpoint
CREATE TABLE "hotel_offers" (
	"id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL,
	"source_id" text NOT NULL,
	"comparable_key" text NOT NULL,
	"checkin" date NOT NULL,
	"checkout" date NOT NULL,
	"adults" smallint NOT NULL,
	"rooms" smallint NOT NULL,
	"total_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"payload" jsonb NOT NULL,
	"is_demo" boolean NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"destination_slug" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"success" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"alert_event_id" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text,
	"mascot" text DEFAULT 'happy' NOT NULL,
	"delivery" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_observations" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"route_key" text NOT NULL,
	"market_key" text NOT NULL,
	"travel_date" date NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"lead_days" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"price_eur_cents" integer NOT NULL,
	"source_id" text NOT NULL,
	"is_demo" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "privacy_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"profile_visibility" text DEFAULT 'private' NOT NULL,
	"map_visibility" text DEFAULT 'private' NOT NULL,
	"show_trips" boolean DEFAULT false NOT NULL,
	"store_search_history" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"city_slug" text,
	"country_iso" text,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"stars" real,
	"address" text,
	"is_demo" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_source_refs" (
	"property_id" text NOT NULL,
	"source_id" text NOT NULL,
	"external_id" text NOT NULL,
	"match_confidence" real NOT NULL,
	CONSTRAINT "property_source_refs_source_id_external_id_pk" PRIMARY KEY("source_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"reason" text NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_by" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"params" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"params" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tip_likes" (
	"user_id" text NOT NULL,
	"tip_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tip_likes_user_id_tip_id_pk" PRIMARY KEY("user_id","tip_id")
);
--> statement-breakpoint
CREATE TABLE "tip_saves" (
	"user_id" text NOT NULL,
	"tip_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tip_saves_user_id_tip_id_pk" PRIMARY KEY("user_id","tip_id")
);
--> statement-breakpoint
CREATE TABLE "tips" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"destination_slug" text NOT NULL,
	"country_iso" text NOT NULL,
	"category" text NOT NULL,
	"kind" text DEFAULT 'experience' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"sponsor_name" text,
	"source_url" text,
	"status" text DEFAULT 'published' NOT NULL,
	"moderation_note" text,
	"content_hash" text NOT NULL,
	"verified_at" timestamp with time zone,
	"like_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"save_count" integer DEFAULT 0 NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"destination_slug" text,
	"start_date" date,
	"end_date" date,
	"budget_cents" integer,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"home_airport" text,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"locale" text DEFAULT 'fr' NOT NULL,
	"typical_budget_cents" integer,
	"travel_styles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"climate_min_c" smallint,
	"climate_max_c" smallint,
	"personalization_enabled" boolean DEFAULT true NOT NULL,
	"notify_in_app" boolean DEFAULT true NOT NULL,
	"notify_email" boolean DEFAULT false NOT NULL,
	"notify_push" boolean DEFAULT false NOT NULL,
	"max_alert_notifications_per_day" smallint DEFAULT 5 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"handle" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"avatar_color" text DEFAULT '#7a9e7e' NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visited_places" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"country_iso" text NOT NULL,
	"city_name" text DEFAULT '' NOT NULL,
	"status" text NOT NULL,
	"visited_from" date,
	"visited_to" date,
	"memory" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"destination_slug" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_country_iso_countries_iso2_fk" FOREIGN KEY ("country_iso") REFERENCES "public"."countries"("iso2") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "climate_normals" ADD CONSTRAINT "climate_normals_destination_slug_destinations_slug_fk" FOREIGN KEY ("destination_slug") REFERENCES "public"."destinations"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "climate_normals" ADD CONSTRAINT "climate_normals_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_tip_id_tips_id_fk" FOREIGN KEY ("tip_id") REFERENCES "public"."tips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_city_slug_cities_slug_fk" FOREIGN KEY ("city_slug") REFERENCES "public"."cities"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_country_iso_countries_iso2_fk" FOREIGN KEY ("country_iso") REFERENCES "public"."countries"("iso2") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flight_offers" ADD CONSTRAINT "flight_offers_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_followee_id_users_id_fk" FOREIGN KEY ("followee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_offers" ADD CONSTRAINT "hotel_offers_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_offers" ADD CONSTRAINT "hotel_offers_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_alert_event_id_alert_events_id_fk" FOREIGN KEY ("alert_event_id") REFERENCES "public"."alert_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_observations" ADD CONSTRAINT "price_observations_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_settings" ADD CONSTRAINT "privacy_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_source_refs" ADD CONSTRAINT "property_source_refs_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_source_refs" ADD CONSTRAINT "property_source_refs_source_id_data_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tip_likes" ADD CONSTRAINT "tip_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tip_likes" ADD CONSTRAINT "tip_likes_tip_id_tips_id_fk" FOREIGN KEY ("tip_id") REFERENCES "public"."tips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tip_saves" ADD CONSTRAINT "tip_saves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tip_saves" ADD CONSTRAINT "tip_saves_tip_id_tips_id_fk" FOREIGN KEY ("tip_id") REFERENCES "public"."tips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tips" ADD CONSTRAINT "tips_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tips" ADD CONSTRAINT "tips_destination_slug_destinations_slug_fk" FOREIGN KEY ("destination_slug") REFERENCES "public"."destinations"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_destination_slug_destinations_slug_fk" FOREIGN KEY ("destination_slug") REFERENCES "public"."destinations"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visited_places" ADD CONSTRAINT "visited_places_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_destination_slug_destinations_slug_fk" FOREIGN KEY ("destination_slug") REFERENCES "public"."destinations"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "airports_country_idx" ON "airports" USING btree ("country_iso");--> statement-breakpoint
CREATE UNIQUE INDEX "alert_events_fp_uq" ON "alert_events" USING btree ("alert_id","fingerprint");--> statement-breakpoint
CREATE INDEX "alerts_user_idx" ON "alerts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "alerts_due_idx" ON "alerts" USING btree ("active","last_checked_at");--> statement-breakpoint
CREATE INDEX "cache_expires_idx" ON "cache_entries" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "cities_country_idx" ON "cities" USING btree ("country_iso");--> statement-breakpoint
CREATE INDEX "comments_tip_idx" ON "comments" USING btree ("tip_id","created_at");--> statement-breakpoint
CREATE INDEX "destinations_country_idx" ON "destinations" USING btree ("country_iso");--> statement-breakpoint
CREATE INDEX "flight_offers_key_idx" ON "flight_offers" USING btree ("comparable_key","fetched_at");--> statement-breakpoint
CREATE UNIQUE INDEX "flight_offers_src_ext_uq" ON "flight_offers" USING btree ("source_id","external_id","fetched_at");--> statement-breakpoint
CREATE INDEX "hotel_offers_key_idx" ON "hotel_offers" USING btree ("comparable_key","fetched_at");--> statement-breakpoint
CREATE INDEX "hotel_offers_prop_idx" ON "hotel_offers" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "interactions_user_idx" ON "interactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "login_attempts_key_idx" ON "login_attempts" USING btree ("key","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "password_resets_token_uq" ON "password_resets" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "price_obs_route_idx" ON "price_observations" USING btree ("route_key","observed_at");--> statement-breakpoint
CREATE INDEX "price_obs_market_idx" ON "price_observations" USING btree ("market_key","travel_date");--> statement-breakpoint
CREATE INDEX "properties_city_idx" ON "properties" USING btree ("city_slug");--> statement-breakpoint
CREATE INDEX "properties_name_idx" ON "properties" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "psr_property_idx" ON "property_source_refs" USING btree ("property_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_endpoint_uq" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_uq" ON "reports" USING btree ("reporter_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "saved_searches_user_idx" ON "saved_searches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "search_history_user_idx" ON "search_history" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_uq" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tips_dest_idx" ON "tips" USING btree ("destination_slug","status");--> statement-breakpoint
CREATE INDEX "tips_author_idx" ON "tips" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "tips_hash_idx" ON "tips" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "trips_user_idx" ON "trips" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_handle_uq" ON "users" USING btree ("handle");--> statement-breakpoint
CREATE UNIQUE INDEX "visited_uq" ON "visited_places" USING btree ("user_id","country_iso","city_name","status");--> statement-breakpoint
CREATE UNIQUE INDEX "wishlist_uq" ON "wishlist_items" USING btree ("user_id","destination_slug");