"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster app-toaster group"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "group toast app-toast",
          description: "app-toast-description",
          actionButton: "app-toast-action",
          cancelButton: "app-toast-cancel",
          closeButton: "app-toast-close",
          error: "app-toast-error",
          success: "app-toast-success",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "white",
          "--normal-text": "rgb(2 6 23)",
          "--normal-border": "rgb(226 232 240)",
          "--border-radius": "8px",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
