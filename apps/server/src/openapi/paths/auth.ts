import { API_ROUTES } from "@feijia/shared";

import {
  jsonRequestBody,
  jsonResponse,
  schemaRef
} from "../builders";
import {
  _sessionCookieSecurity as sessionCookieSecurity,
  adminSessionSecurity,
  optionalBearerSecurity,
  optionalSessionCookieSecurity,
  sessionOrBearerSecurity
} from "../security";

export const authPaths = {
  [API_ROUTES.auth.captchaChallenge]: {
    post: {
      tags: ["auth"],
      summary: "Create a captcha challenge",
      description:
        "Returns a challengeId and SVG markup for the captcha image. The answer is stored server-side and is later submitted to the SMS request endpoint.",
      responses: {
        "200": jsonResponse("CaptchaChallengeResponse", "Captcha challenge created.")
      }
    }
  },
  [API_ROUTES.auth.smsRequest]: {
    post: {
      tags: ["auth"],
      summary: "Request an SMS verification code",
      requestBody: jsonRequestBody(
        "SmsCodeRequest",
        "Submits the phone number together with the captcha challenge answer."
      ),
      responses: {
        "200": jsonResponse("SmsCodeResponse", "SMS code created or sent successfully."),
        "400": jsonResponse("AuthErrorResponse", "Invalid phone or captcha input."),
        "503": jsonResponse("AuthErrorResponse", "SMS provider is currently unavailable.")
      }
    }
  },
  [API_ROUTES.auth.webLogin]: {
    post: {
      tags: ["auth"],
      summary: "Login on the web client",
      requestBody: jsonRequestBody(
        "WebLoginRequest",
        "Logs in with either SMS code or password. Password login requires a captcha challenge."
      ),
      responses: {
        "200": jsonResponse("WebLoginResponse", "Authenticated result or registration continuation."),
        "400": jsonResponse("AuthErrorResponse", "Invalid login input or SMS code."),
        "429": jsonResponse("AuthErrorResponse", "Password login failures are temporarily rate limited."),
        "409": jsonResponse("AuthErrorResponse", "Account state conflict.")
      }
    }
  },
  [API_ROUTES.auth.webRegisterComplete]: {
    post: {
      tags: ["auth"],
      summary: "Complete web registration",
      requestBody: jsonRequestBody(
        "CompleteWebRegistrationRequest",
        "Uses the registration token to finalize profile setup."
      ),
      responses: {
        "200": jsonResponse("AuthSuccessResponse", "Registration completed."),
        "400": jsonResponse("AuthErrorResponse", "Invalid registration token or display name."),
        "409": jsonResponse("AuthErrorResponse", "Display-name or phone conflict.")
      }
    }
  },
  [API_ROUTES.auth.webRefresh]: {
    post: {
      tags: ["auth"],
      summary: "Refresh a web session",
      security: optionalSessionCookieSecurity,
      responses: {
        "200": jsonResponse("AuthSuccessResponse", "Session refreshed and cookies renewed."),
        "401": jsonResponse("AuthErrorResponse", "Refresh token is missing, invalid or expired.")
      }
    }
  },
  [API_ROUTES.auth.webChangePassword]: {
    post: {
      tags: ["auth"],
      summary: "Change the current web password",
      security: sessionCookieSecurity,
      requestBody: jsonRequestBody(
        "UserPasswordChangeRequest",
        "Submits the current password and a new strong password for the current web user."
      ),
      responses: {
        "200": jsonResponse("ActionSuccessResponse", "Password changed successfully."),
        "400": jsonResponse("AuthErrorResponse", "Current password is invalid or the new password is not allowed."),
        "401": jsonResponse("AuthErrorResponse", "Web session is missing or expired."),
        "403": jsonResponse("AuthErrorResponse", "Only web user sessions can perform this action.")
      }
    }
  },
  [API_ROUTES.auth.appLogin]: {
    post: {
      tags: ["auth"],
      summary: "Login on the mobile app",
      requestBody: jsonRequestBody(
        "AppLoginRequest",
        "Consumes the SMS code for the phone number and optionally records deviceLabel, deviceType (ios/android/harmony/miniapp-wechat/web) and pushToken."
      ),
      responses: {
        "200": jsonResponse("AppLoginResponse", "Authenticated result or registration continuation."),
        "400": jsonResponse("AuthErrorResponse", "Invalid login input or SMS code.")
      }
    }
  },
  [API_ROUTES.auth.appRegisterComplete]: {
    post: {
      tags: ["auth"],
      summary: "Complete app registration",
      requestBody: jsonRequestBody(
        "CompleteAppRegistrationRequest",
        "Finalizes app registration and returns access/refresh tokens."
      ),
      responses: {
        "200": jsonResponse("AppAuthSessionResponse", "Registration completed with app session tokens."),
        "400": jsonResponse("AuthErrorResponse", "Invalid registration token or display name."),
        "409": jsonResponse("AuthErrorResponse", "Display-name or phone conflict.")
      }
    }
  },
  [API_ROUTES.auth.adminLogin]: {
    post: {
      tags: ["auth"],
      summary: "Login to the admin console",
      requestBody: jsonRequestBody(
        "AdminLoginRequest",
        "Authenticates an admin account with account, password and captcha challenge."
      ),
      responses: {
        "200": jsonResponse("AuthSuccessResponse", "Admin login succeeded and session cookies were set."),
        "400": jsonResponse("AuthErrorResponse", "Invalid captcha or admin credentials."),
        "429": jsonResponse("AuthErrorResponse", "Admin account is temporarily locked.")
      }
    }
  },
  [API_ROUTES.auth.adminChangePassword]: {
    post: {
      tags: ["auth"],
      summary: "Change the admin password",
      security: adminSessionSecurity,
      requestBody: jsonRequestBody(
        "AdminPasswordChangeRequest",
        "Submits the current password and a new password."
      ),
      responses: {
        "200": jsonResponse("ActionSuccessResponse", "Password changed successfully."),
        "400": jsonResponse("AuthErrorResponse", "Current password is invalid or the new password is not allowed."),
        "403": jsonResponse("AuthErrorResponse", "Only admins can perform this action.")
      }
    }
  },
  [API_ROUTES.auth.registrationDisplayNameSuggest]: {
    post: {
      tags: ["auth"],
      summary: "Suggest another registration display name",
      requestBody: jsonRequestBody(
        "RegistrationDisplayNameSuggestRequest",
        "Generates another available display-name candidate from a registration token."
      ),
      responses: {
        "200": jsonResponse("RegistrationDisplayNameSuggestResponse", "A new display-name suggestion."),
        "400": jsonResponse("AuthErrorResponse", "Registration token is invalid or expired.")
      }
    }
  },
  [API_ROUTES.auth.currentUser]: {
    get: {
      tags: ["auth"],
      summary: "Get the current web session user",
      security: optionalSessionCookieSecurity,
      responses: {
        "200": jsonResponse("CurrentUserResponse", "Returns the current session user or null.")
      }
    }
  },
  [API_ROUTES.auth.appCurrentUser]: {
    get: {
      tags: ["auth"],
      summary: "Get the current app session user",
      security: optionalBearerSecurity,
      responses: {
        "200": jsonResponse("CurrentUserResponse", "Returns the current bearer-token user or null.")
      }
    }
  },
  [API_ROUTES.auth.adminCurrentUser]: {
    get: {
      tags: ["auth"],
      summary: "Get the current admin session user",
      security: optionalSessionCookieSecurity,
      responses: {
        "200": jsonResponse("CurrentUserResponse", "Returns the current admin user or null.")
      }
    }
  },
  [API_ROUTES.auth.logout]: {
    post: {
      tags: ["auth"],
      summary: "Logout the current web session",
      security: optionalSessionCookieSecurity,
      responses: {
        "200": jsonResponse("CurrentUserResponse", "Logout completed and the user is now null.")
      }
    }
  },
  [API_ROUTES.auth.appLogout]: {
    post: {
      tags: ["auth"],
      summary: "Logout the current app session",
      security: optionalBearerSecurity,
      responses: {
        "200": jsonResponse("CurrentUserResponse", "Logout completed and the user is now null.")
      }
    }
  },
  [API_ROUTES.auth.appRefresh]: {
    post: {
      tags: ["auth"],
      summary: "Refresh app tokens",
      requestBody: jsonRequestBody(
        "AppRefreshRequest",
        "Exchanges a refresh token for renewed app session credentials."
      ),
      responses: {
        "200": jsonResponse("AppAuthSessionResponse", "App session refreshed."),
        "400": jsonResponse("AuthErrorResponse", "Refresh token is invalid or expired.")
      }
    }
  },
  [API_ROUTES.auth.adminLogout]: {
    post: {
      tags: ["auth"],
      summary: "Logout the current admin session",
      security: optionalSessionCookieSecurity,
      responses: {
        "200": jsonResponse("CurrentUserResponse", "Logout completed and the user is now null.")
      }
    }
  },
  [API_ROUTES.auth.protectedPing]: {
    get: {
      tags: ["auth"],
      summary: "Verify a logged-in user session",
      security: sessionOrBearerSecurity,
      responses: {
        "200": jsonResponse("PingResponse", "User session is valid."),
        "401": jsonResponse("ErrorResponse", "Not authenticated.")
      }
    }
  },
  [API_ROUTES.auth.adminProtectedPing]: {
    get: {
      tags: ["auth"],
      summary: "Verify an admin session",
      security: adminSessionSecurity,
      responses: {
        "200": jsonResponse("PingResponse", "Admin session is valid."),
        "401": jsonResponse("ErrorResponse", "Not authenticated."),
        "403": jsonResponse("ErrorResponse", "Session is not an admin session.")
      }
    }
  },
  [API_ROUTES.auth.adminSessions]: {
    get: {
      tags: ["auth"],
      summary: "List recent login sessions",
      security: adminSessionSecurity,
      responses: {
        "200": jsonResponse("AdminRecentSessionsResponse", "Recent sessions returned."),
        "401": jsonResponse("ErrorResponse", "Not authenticated."),
        "403": jsonResponse("ErrorResponse", "Session is not an admin session.")
      }
    }
  },
  [API_ROUTES.auth.deviceRegister]: {
    post: {
      tags: ["auth"],
      summary: "Register a device push token",
      description:
        "Registers device metadata and a push token after login so notifications can target the device.",
      security: sessionOrBearerSecurity,
      requestBody: jsonRequestBody(
        "DeviceRegisterRequest",
        "Device type, push token and optional device label."
      ),
      responses: {
        "200": jsonResponse("DeviceRegisterResponse", "Device registered successfully."),
        "400": jsonResponse("ErrorResponse", "Invalid request payload."),
        "401": jsonResponse("ErrorResponse", "Not authenticated.")
      }
    }
  },
  [API_ROUTES.auth.deviceUnregister]: {
    post: {
      tags: ["auth"],
      summary: "Unregister a device push token",
      description:
        "Unregisters a specific push token or all device registrations for the current user if no token is provided.",
      security: sessionOrBearerSecurity,
      requestBody: {
        description: "Optional push token. When omitted, all device registrations for the user are removed.",
        required: false,
        content: {
          "application/json": {
            schema: schemaRef("DeviceUnregisterRequest")
          }
        }
      },
      responses: {
        "200": jsonResponse("ActionSuccessResponse", "Device unregistered successfully."),
        "401": jsonResponse("ErrorResponse", "Not authenticated.")
      }
    }
  }
} as const;
