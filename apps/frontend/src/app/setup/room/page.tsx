"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSessionData } from "@/hooks/useSessionData";

/** Anonymous flow: one draft household per browser for `/setup/room` without an ID in the URL. */
const DRAFT_HOUSEHOLD_STORAGE_KEY = "awa_draft_household_id_room_setup";

export default function RoomSetupIndexPage() {
  const router = useRouter();
  const { sessionData, isInitialized } = useSessionData();
  const draftNavigatedRef = useRef(false);

  useEffect(() => {
    if (!isInitialized) return;
    if (typeof window === "undefined") return;

    const fromSession = sessionData?.households?.[0]?.id;
    if (fromSession) {
      router.replace(`/setup/room/${fromSession}`);
      return;
    }

    if (draftNavigatedRef.current) return;

    let id = window.localStorage.getItem(DRAFT_HOUSEHOLD_STORAGE_KEY);
    if (!id) {
      id = `household-${Date.now()}`;
      window.localStorage.setItem(DRAFT_HOUSEHOLD_STORAGE_KEY, id);
    }

    draftNavigatedRef.current = true;
    router.replace(`/setup/room/${id}`);
  }, [isInitialized, router, sessionData?.households?.[0]?.id]);

  return (
    <div className="min-h-screen flex items-center justify-center" aria-busy="true" aria-label="Loading room setup">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-gold" />
    </div>
  );
}
