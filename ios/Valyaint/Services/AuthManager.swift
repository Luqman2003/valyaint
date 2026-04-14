import Foundation
import SwiftUI

@MainActor
class AuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?

    private let api = APIClient.shared

    init() {
        // Check if we have a valid session on launch
        Task { await checkSession() }
    }

    func checkSession() async {
        do {
            let response: SessionResponse = try await api.get("/api/auth/session")
            if let user = response.user {
                currentUser = User(id: user.id ?? "", email: user.email, displayName: user.name ?? "", avatarUrl: user.image)
                isAuthenticated = true
            }
        } catch {
            isAuthenticated = false
            currentUser = nil
        }
    }

    func login(email: String, password: String) async throws {
        // NextAuth credentials login via CSRF + POST
        let csrfResponse: CSRFResponse = try await api.get("/api/auth/csrf")

        let _: LoginResponse = try await api.post("/api/auth/callback/credentials", body: [
            "email": email,
            "password": password,
            "csrfToken": csrfResponse.csrfToken,
            "json": "true"
        ])

        await checkSession()

        if !isAuthenticated {
            throw APIError.serverError("Invalid email or password")
        }
    }

    func register(email: String, password: String, displayName: String) async throws {
        let _: RegisterResponse = try await api.post("/api/auth/register", body: [
            "email": email,
            "password": password,
            "displayName": displayName
        ])

        // Auto-login after register
        try await login(email: email, password: password)
    }

    func logout() async {
        // Clear cookies
        if let cookies = HTTPCookieStorage.shared.cookies {
            for cookie in cookies {
                HTTPCookieStorage.shared.deleteCookie(cookie)
            }
        }
        isAuthenticated = false
        currentUser = nil
    }

    func refreshUser() async {
        do {
            let user: User = try await api.get("/api/users/me")
            currentUser = user
        } catch {}
    }
}

// Response types for auth
private struct CSRFResponse: Codable {
    let csrfToken: String
}

private struct LoginResponse: Codable {
    let url: String?
}

private struct RegisterResponse: Codable {
    let id: String
    let email: String
    let displayName: String
}

private struct SessionResponse: Codable {
    let user: SessionUser?

    struct SessionUser: Codable {
        let id: String?
        let name: String?
        let email: String?
        let image: String?
    }
}
