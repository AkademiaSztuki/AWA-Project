export type RoomWizardStep =
  | "photo"
  | "prs-current"
  | "usage"
  | "activities"
  | "pain-points"
  | "room-swipes"
  | "prs-target"
  | "summary";

export interface RoomMoodPoint {
  x: number;
  y: number;
}

export interface RoomSwipe {
  imageId: number;
  direction: "left" | "right";
  reactionTime: number;
  dwellTime: number;
  tags?: string[];
  categories?: Record<string, unknown>;
}

export interface RoomData {
  name: string;
  roomType: string;
  usageType: "solo" | "shared";
  sharedWith?: string[];
  photos: string[];
  prsCurrent?: RoomMoodPoint;
  prsTarget?: RoomMoodPoint;
  painPoints: string[];
  activities: string[];
  activitySatisfaction?: Record<string, string>;
  socialDynamics?: unknown;
  roomSwipes?: RoomSwipe[];
}
