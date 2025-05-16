"use client";
import { envVars } from "@/utilities/enviromentVars";
import * as amplitude from "@amplitude/analytics-browser";
import {
  AmplitudeReturn,
  Result,
} from "@amplitude/analytics-browser/lib/esm/types";
import { useEffect, useState } from "react";

export interface IAmplitudeEvent {
  event: string;
  properties?: Record<string, unknown>;
}

interface IUseMetrics {
  captureClient: {
    reportEvent: (data: IAmplitudeEvent) => Promise<amplitude.Types.Result>;
  };
}

export const useMetrics = (prefix = "gap"): IUseMetrics => {
  useEffect(() => {
    if (envVars.AMPLITUDE_KEY) {
      amplitude.init(envVars.AMPLITUDE_KEY);
    }
  }, []);

  const reportEvent = (
    data: IAmplitudeEvent
  ): Promise<amplitude.Types.Result> => {
    console.log("reportEvent", data);
    return amplitude.track(`${prefix}:${data.event}`, data.properties || {})
      .promise;
  };

  return { captureClient: { reportEvent } };
};
