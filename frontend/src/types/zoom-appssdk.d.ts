declare module "@zoom/appssdk" {
  interface ZoomAppsSDK {
    config(options: {
      popoutSize?: { width: number; height: number };
      capabilities?: string[];
    }): Promise<any>;
    getMeetingContext?(): Promise<any>;
    getMeetingParticipants?(): Promise<any[]>;
    getParticipants?(): Promise<any[]>;
    onActiveSpeakerChange?(
      callback: (event: {
        activeSpeakerId?: string | null;
        activeSpeaker?: string | null;
      }) => void
    ): void;
    onParticipantChange?(callback: () => void): void;
    on?(event: string, callback: (...args: any[]) => void): Promise<void>;
  }

  const zoomSdk: ZoomAppsSDK;
  export default zoomSdk;
}

