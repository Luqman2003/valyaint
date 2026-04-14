import SwiftUI
import PhotosUI

struct ProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var photoItem: PhotosPickerItem?
    @State private var uploading = false
    @State private var filter: PostFilter = .photos
    @State private var posts: [Post] = []
    @State private var loading = true

    enum PostFilter: String, CaseIterable {
        case photos, text
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 16) {
                    PhotosPicker(selection: $photoItem, matching: .images) {
                        ZStack {
                            AvatarView(
                                name: authManager.currentUser?.displayName ?? "?",
                                avatarUrl: authManager.currentUser?.avatarUrl,
                                size: 80
                            )
                            Circle()
                                .fill(.black.opacity(0.4))
                                .frame(width: 80, height: 80)
                                .overlay {
                                    Text(uploading ? "..." : "Edit")
                                        .font(.caption.bold())
                                }
                                .opacity(0.001)
                        }
                    }

                    VStack(spacing: 4) {
                        Text(authManager.currentUser?.displayName ?? "")
                            .font(.title2.bold())
                        Text(authManager.currentUser?.email ?? "")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 20)

                // Filter toggle
                HStack(spacing: 0) {
                    ForEach(PostFilter.allCases, id: \.self) { tab in
                        Button {
                            filter = tab
                        } label: {
                            VStack(spacing: 8) {
                                Text(tab.rawValue.capitalized)
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(filter == tab ? .primary : .secondary)
                                Rectangle()
                                    .fill(filter == tab ? Color.white : Color.clear)
                                    .frame(height: 1.5)
                            }
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
                .padding(.horizontal)

                Divider().overlay(Color(.systemGray5))

                // Posts
                if loading {
                    ProgressView()
                        .padding(.top, 40)
                } else if posts.isEmpty {
                    Text("No \(filter == .photos ? "photo" : "text") posts yet")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .padding(.top, 40)
                } else if filter == .photos {
                    photoGrid
                } else {
                    textList
                }

                // Sign out
                Button(role: .destructive) {
                    Task { await authManager.logout() }
                } label: {
                    Text("Sign out")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .padding(24)
            }
        }
        .navigationTitle("Profile")
        .onChange(of: photoItem) {
            Task { await uploadAvatar() }
        }
        .onChange(of: filter) {
            Task { await loadPosts() }
        }
        .task { await loadPosts() }
    }

    private var photoGrid: some View {
        let columns = Array(repeating: GridItem(.flexible(), spacing: 1.5), count: 3)
        return LazyVGrid(columns: columns, spacing: 1.5) {
            ForEach(posts) { post in
                NavigationLink(destination: PostDetailView(postId: post.id)) {
                    Color.clear
                        .aspectRatio(1, contentMode: .fit)
                        .overlay {
                            AsyncImage(url: URL(string: photoURL(post.photos.first?.url ?? ""))) { image in
                                image
                                    .resizable()
                                    .scaledToFill()
                            } placeholder: {
                                Rectangle().fill(Color(.systemGray5))
                            }
                        }
                        .clipped()
                        .overlay(alignment: .topTrailing) {
                            if post.photos.count > 1 {
                                Image(systemName: "square.on.square")
                                    .font(.caption2)
                                    .foregroundStyle(.white)
                                    .shadow(radius: 2)
                                    .padding(6)
                            }
                        }
                }
            }
        }
    }

    private var textList: some View {
        LazyVStack(spacing: 0) {
            ForEach(posts) { post in
                NavigationLink(destination: PostDetailView(postId: post.id)) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(post.content ?? "")
                            .font(.subheadline)
                            .lineLimit(3)
                            .foregroundStyle(.primary)
                            .multilineTextAlignment(.leading)

                        HStack(spacing: 8) {
                            Text(post.group.name)
                            Text(timeAgo(post.createdAt))
                            if post._count.comments > 0 {
                                Text("\(post._count.comments) comment\(post._count.comments != 1 ? "s" : "")")
                            }
                        }
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
                Divider().overlay(Color(.systemGray5))
            }
        }
    }

    private func loadPosts() async {
        loading = true
        do {
            let response: FeedResponse = try await APIClient.shared.get(
                "/api/users/me/posts",
                query: ["filter": filter.rawValue]
            )
            posts = response.posts
        } catch {
            posts = []
        }
        loading = false
    }

    private func uploadAvatar() async {
        guard let photoItem,
              let data = try? await photoItem.loadTransferable(type: Data.self) else { return }

        uploading = true

        guard let image = UIImage(data: data),
              let jpegData = image.jpegData(compressionQuality: 1.0) else {
            uploading = false
            return
        }

        do {
            let url = try await APIClient.shared.uploadImage(imageData: jpegData, filename: "avatar.jpg")
            let _: User = try await APIClient.shared.patch("/api/users/me", body: ["avatarUrl": url])
            await authManager.refreshUser()
        } catch {}

        uploading = false
        self.photoItem = nil
    }

    private func photoURL(_ path: String) -> String {
        if path.hasPrefix("http") { return path }
        #if targetEnvironment(simulator)
        return "http://localhost:3000\(path)"
        #else
        return "http://10.0.0.151:3000\(path)"
        #endif
    }

    private func timeAgo(_ dateStr: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: dateStr) else { return "" }
        let diff = Date().timeIntervalSince(date)
        let mins = Int(diff / 60)
        if mins < 1 { return "now" }
        if mins < 60 { return "\(mins)m" }
        let hrs = mins / 60
        if hrs < 24 { return "\(hrs)h" }
        return "\(hrs / 24)d"
    }
}
