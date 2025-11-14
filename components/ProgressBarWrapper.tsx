"use client"
import { AppProgressBar as ProgressBar } from "next-nprogress-bar"

export const ProgressBarWrapper = () => {
  return (
    <ProgressBar height="4px" color="#4C6FFF" options={{ showSpinner: false }} shallowRouting />
  )
}
