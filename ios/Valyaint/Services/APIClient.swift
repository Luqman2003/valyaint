import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case unauthorized
    case serverError(String)
    case decodingError

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .unauthorized: return "Not authenticated"
        case .serverError(let msg): return msg
        case .decodingError: return "Failed to decode response"
        }
    }
}

actor APIClient {
    static let shared = APIClient()

    // Change this to your server's address
    #if targetEnvironment(simulator)
    private let baseURL = "http://localhost:3000"
    #else
    // For physical device, use your Mac's local IP
    private let baseURL = "http://10.0.0.151:3000"
    #endif

    private let session: URLSession
    private let decoder: JSONDecoder

    private init() {
        let config = URLSessionConfiguration.default
        config.httpCookieAcceptPolicy = .always
        config.httpCookieStorage = HTTPCookieStorage.shared
        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
    }

    // MARK: - Generic request methods

    func get<T: Decodable>(_ path: String, query: [String: String] = [:]) async throws -> T {
        var components = URLComponents(string: baseURL + path)!
        if !query.isEmpty {
            components.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        guard let url = components.url else { throw APIError.invalidURL }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        return try await perform(request)
    }

    func post<T: Decodable>(_ path: String, body: [String: Any]? = nil) async throws -> T {
        let url = URL(string: baseURL + path)!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        return try await perform(request)
    }

    func patch<T: Decodable>(_ path: String, body: [String: Any]) async throws -> T {
        let url = URL(string: baseURL + path)!
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        return try await perform(request)
    }

    func delete(_ path: String, query: [String: String] = [:]) async throws {
        var components = URLComponents(string: baseURL + path)!
        if !query.isEmpty {
            components.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        guard let url = components.url else { throw APIError.invalidURL }

        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"

        let (_, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.serverError("No response") }
        if http.statusCode == 401 { throw APIError.unauthorized }
        if http.statusCode >= 400 { throw APIError.serverError("Delete failed") }
    }

    /// Upload image via presigned S3 URL. Returns the public URL.
    func uploadImage(imageData: Data, filename: String, contentType: String = "image/jpeg") async throws -> String {
        // 1. Get presigned URL from our API
        let presign: PresignResponse = try await post("/api/upload/presign", body: [
            "filename": filename,
            "contentType": contentType
        ])

        // 2. PUT directly to S3
        guard let s3Url = URL(string: presign.presignedUrl) else { throw APIError.invalidURL }
        var request = URLRequest(url: s3Url)
        request.httpMethod = "PUT"
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        request.httpBody = imageData

        let (_, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode < 300 else {
            throw APIError.serverError("S3 upload failed")
        }

        return presign.publicUrl
    }

    // MARK: - Private

    private func perform<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.serverError("No response") }

        if http.statusCode == 401 { throw APIError.unauthorized }

        if http.statusCode >= 400 {
            if let errorBody = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let error = errorBody["error"] as? String {
                throw APIError.serverError(error)
            }
            throw APIError.serverError("Request failed (\(http.statusCode))")
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError
        }
    }
}
