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
              data?.message || "Invalid request data",
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
              data?.message || "Invalid data provided",
              ErrorType.VALIDATION,
              status,
              data
            );
          case 500:
            return new AppError(
              "Server error occurred. Please try again later.",
              ErrorType.SERVER,
              status
            );
          default:
            return new AppError(
              data?.message || fallbackMessage,
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
        toast.error(error.message, toastConfig);
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
