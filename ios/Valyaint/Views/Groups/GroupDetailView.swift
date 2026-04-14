import SwiftUI

struct GroupDetailView: View {
    let groupId: String
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) var dismiss

    @State private var group: GroupDetail?
    @State private var posts: [Post] = []
    @State private var nextCursor: String?
    @State private var showMembers = false
    @State private var copied = false

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                if let group {
                    // Header
                    VStack(alignment: .leading, spacing: 12) {
                        if let desc = group.description, !desc.isEmpty {
                            Text(desc)
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }

                        HStack(spacing: 8) {
                            Button {
                                showMembers.toggle()
                            } label: {
                                Label("\(group.memberships.count) members", systemImage: "person.2")
                                    .font(.caption)
                            }
                            .buttonStyle(.bordered)
                            .buttonBorderShape(.capsule)
                            .controlSize(.small)

                            Button {
                                copyInvite()
                            } label: {
                                Text(copied ? "Copied!" : "Invite")
                                    .font(.caption)
                            }
                            .buttonStyle(.bordered)
                            .buttonBorderShape(.capsule)
                            .controlSize(.small)

                            Spacer()

                            if group.role == "OWNER" {
                                Button("Delete", role: .destructive) {
                                    deleteGroup()
                                }
                                .font(.caption)
                                .buttonStyle(.bordered)
                                .buttonBorderShape(.capsule)
                                .controlSize(.small)
                            } else {
                                Button("Leave") {
                                    leaveGroup()
                                }
                                .font(.caption)
                                .foregroundStyle(.red)
                                .buttonStyle(.bordered)
                                .buttonBorderShape(.capsule)
                                .controlSize(.small)
                            }
                        }

                        if showMembers {
                            VStack(alignment: .leading, spacing: 8) {
                                ForEach(group.memberships) { member in
                                    HStack(spacing: 8) {
                                        AvatarView(name: member.user.displayName, avatarUrl: member.user.avatarUrl, size: 28)
                                        Text(member.user.displayName)
                                            .font(.footnote)
                                        if member.role == "OWNER" {
                                            Text("owner")
                                                .font(.system(size: 9))
                                                .foregroundStyle(.secondary)
                                        }
                                    }
                                }
                            }
                            .padding(.top, 4)
                        }
                    }
                    .padding(16)

                    Divider().overlay(Color(.systemGray5))

                    // Posts
                    if posts.isEmpty {
                        Text("No posts yet. Be the first!")
                            .foregroundStyle(.secondary)
                            .padding(.top, 40)
                    } else {
                        LazyVStack(spacing: 0) {
                            ForEach(posts) { post in
                                PostCardView(
                                    post: post,
                                    showGroup: false,
                                    onEdit: { content in editPost(post.id, content: content) },
                                    onDelete: { deletePost(post.id) },
                                    currentUserId: authManager.currentUser?.id
                                )
                                Divider().overlay(Color(.systemGray5))
                            }

                            if nextCursor != nil {
                                Button("Load more") {
                                    Task { await fetchPosts(cursor: nextCursor) }
                                }
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                                .padding()
                            }
                        }
                    }
                } else {
                    ProgressView().padding(.top, 60)
                }
            }
        }
        .navigationTitle(group?.name ?? "Group")
        .refreshable { await loadAll() }
        .task { await loadAll() }
    }

    private func loadAll() async {
        async let g: GroupDetail = APIClient.shared.get("/api/groups/\(groupId)")
        group = try? await g
        await fetchPosts()
    }

    private func fetchPosts(cursor: String? = nil) async {
        var query: [String: String] = [:]
        if let cursor { query["cursor"] = cursor }

        do {
            let response: FeedResponse = try await APIClient.shared.get("/api/groups/\(groupId)/posts", query: query)
            if cursor != nil {
                posts.append(contentsOf: response.posts)
            } else {
                posts = response.posts
            }
            nextCursor = response.nextCursor
        } catch {}
    }

    private func copyInvite() {
        guard let code = group?.inviteCode else { return }
        #if targetEnvironment(simulator)
        let base = "http://localhost:3000"
        #else
        let base = "http://10.0.0.151:3000"
        #endif
        UIPasteboard.general.string = "\(base)/join/\(code)"
        copied = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { copied = false }
    }

    private func leaveGroup() {
        Task {
            try await APIClient.shared.delete("/api/groups/\(groupId)/members")
            dismiss()
        }
    }

    private func deleteGroup() {
        Task {
            try await APIClient.shared.delete("/api/groups/\(groupId)")
            dismiss()
        }
    }

    private func editPost(_ postId: String, content: String) {
        Task {
            let _: Post = try await APIClient.shared.patch("/api/posts/\(postId)", body: ["content": content])
            await fetchPosts()
        }
    }

    private func deletePost(_ postId: String) {
        Task {
            try await APIClient.shared.delete("/api/posts/\(postId)")
            posts.removeAll { $0.id == postId }
        }
    }
}
