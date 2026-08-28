import { toast } from "sonner";
import { logger } from "@/lib/logger";

// Error types for better handling
export enum ErrorType {
  NETWORK = "NETWORK",
  VALIDATION = "VALIDATION",
  AUTHENTICATION = "AUTHENTICATION",
  AUTHORIZATION = "AUTHORIZATION",
  NOT_FOUND = "NOT_FOUND",
  SERVER = "SERVER",
  UNKNOWN = "UNKNOWN",
}

// Custom error class
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode?: number;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    statusCode?: number,
    details?: Record<string, any>
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.name = "AppError";
  }
}

// Turn a noisy backend error into one short, human-readable line.
// Strips Pydantic boilerplate ("N validation errors for X", "[type=…]",
// "For further information visit …"), flattens FastAPI 422 detail arrays to the
// first message, collapses whitespace, and caps the length so toasts stay clean.
function stripNoise(raw: string): string {
  let s = String(raw).trim();
  s = s.replace(/^\d+\s+validation errors?\s+for\s+\S+/i, "");
  s = s.replace(/\[type=[^\]]*\]/gi, "");
  s = s.replace(/For further information visit https?:\/\/\S+/gi, "");
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/^[:\-\s]+/, "").trim();
  if (s.length > 160) s = `${s.slice(0, 157).trimEnd()}…`;
  // Capitalize first letter for a tidier toast.
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function fieldLabel(field: unknown): string | null {
  if (typeof field !== "string" || !field || field === "body" || field === "__root__") {
    return null;
  }
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function cleanErrorMessage(input: unknown, fallback = "Something went wrong. Please try again."): string {
  if (input == null) return fallback;

  // FastAPI 422: detail is an array of { loc, msg, type }
  if (Array.isArray(input)) {
    const first = input.find((e) => e && (e.msg || e.message)) as any;
    if (!first) return fallback;
    const msg = stripNoise(first.msg || first.message);
    const label = fieldLabel(first.loc?.[first.loc.length - 1]);
    return label ? `${label}: ${msg}` : msg || fallback;
  }

  if (typeof input === "object") {
    const obj = input as any;
    if (obj.detail || obj.msg || obj.message) {
      return cleanErrorMessage(obj.detail ?? obj.msg ?? obj.message, fallback);
    }
    return fallback;
  }

  return stripNoise(input as string) || fallback;
}

// Stable-ish id so the same error fired twice (e.g. a React Query mutation
// onError plus a component catch handler) collapses into a single toast
// instead of stacking duplicates.
function toastIdFor(message: string): string {
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    hash = (hash * 31 + message.charCodeAt(i)) | 0;
  }
  return `err-${hash}`;
}

// Error handler utility
export class ErrorHandler {
  static handle(error: unknown, fallbackMessage = "An unexpected error occurred"): void {
    const appError = this.parseError(error, fallbackMessage);
    
    // Log error in development
    logger.error("Error details:", appError);

    // Show user-friendly toast
    this.showToast(appError);
  }

  static parseError(error: unknown, fallbackMessage: string): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      // Handle network errors
      if (error.message.includes("Network Error") || error.message.includes("fetch")) {
        return new AppError(
          "Network connection failed. Please check your internet connection.",
          ErrorType.NETWORK,
          undefined,
          { originalError: error.message }
        );
      }

      // Handle axios errors
      if ("response" in error) {
        const axiosError = error as any;
        const status = axiosError.response?.status;
        const data = axiosError.response?.data;

        switch (status) {
          case 400:
            return new AppError(
              cleanErrorMessage(data?.detail ?? data?.message, "Invalid request data"),
              ErrorType.VALIDATION,
              status,
              data
            );
          case 401:
            return new AppError(
              "Your session has expired. Please log in again.",
              ErrorType.AUTHENTICATION,
              status
            );
          case 403:
            return new AppError(
              "You don't have permission to perform this action.",
              ErrorType.AUTHORIZATION,
              status
            );
          case 404:
            return new AppError(
              "The requested resource was not found.",
              ErrorType.NOT_FOUND,
              status
            );
          case 422:
            return new AppError(
              cleanErrorMessage(data?.detail ?? data?.message, "Invalid data provided"),
              ErrorType.VALIDATION,
              status,
              data
            );
          case 500:
            return new AppError(
              cleanErrorMessage(data?.detail ?? data?.message, "Server error occurred. Please try again later."),
              ErrorType.SERVER,
              status
            );
          default:
            return new AppError(
              cleanErrorMessage(data?.detail ?? data?.message, fallbackMessage),
              ErrorType.UNKNOWN,
              status,
              data
            );
        }
      }

      return new AppError(error.message, ErrorType.UNKNOWN, undefined, {
        originalError: error.message,
      });
    }

    return new AppError(fallbackMessage, ErrorType.UNKNOWN);
  }

  private static showToast(error: AppError): void {
    const toastConfig = {
      duration: error.type === ErrorType.NETWORK ? 8000 : 4000,
      position: "top-right" as const,
      // Dedupe: identical errors raised from multiple handlers share one toast.
      id: toastIdFor(error.message),
    };

    switch (error.type) {
      case ErrorType.NETWORK:
        toast.error(error.message, {
          ...toastConfig,
          description: "Please check your connection and try again.",
        });
        break;
      case ErrorType.AUTHENTICATION:
        toast.error(error.message, {
          ...toastConfig,
          description: "You will be redirected to the login page.",
        });
        break;
      case ErrorType.AUTHORIZATION:
        toast.warning(error.message, toastConfig);
        break;
      case ErrorType.VALIDATION:
        toast.error(error.message, {
          ...toastConfig,
          description: "Please check your input and try again.",
        });
        break;
      case ErrorType.NOT_FOUND:
        toast.error(error.message, toastConfig);
        break;
      case ErrorType.SERVER:
        toast.error(error.message, {
          ...toastConfig,
          description: "Our team has been notified. Please try again later.",
        });
        break;
      default:
        toast.error(error.message, toastConfig);
    }
  }

  // Async error wrapper
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    fallbackMessage = "Operation failed"
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handle(error, fallbackMessage);
      throw error;
    }
  }

  // React Query error handler
  static getQueryErrorHandler(fallbackMessage = "Failed to load data") {
    return (error: unknown) => {
      this.handle(error, fallbackMessage);
    };
  }

  // React Query mutation error handler
  static getMutationErrorHandler(fallbackMessage = "Operation failed") {
    return (error: unknown) => {
      this.handle(error, fallbackMessage);
    };
  }
}

// Success toast helper
export const showSuccessToast = (message: string, description?: string) => {
  toast.success(message, {
    description,
    duration: 3000,
    position: "top-right",
  });
};

// Warning toast helper
export const showWarningToast = (title: string, description?: string) => {
  toast.warning(title, {
    description,
    duration: 5000,
    position: "top-right",
  });
};

// Error toast helper
export const showErrorToast = (title: string, description?: string) => {
  toast.error(title, {
    description,
    duration: 5000,
    position: "top-right",
  });
};
