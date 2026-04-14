import SwiftUI

struct FeedView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var posts: [Post] = []
    @State private var groups: [Group] = []
    @State private var selectedGroupId = ""
    @State private var nextCursor: String?
    @State private var loading = true

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Filter
                if !groups.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            filterChip("All", isSelected: selectedGroupId.isEmpty) {
                                selectedGroupId = ""
                            }
                            ForEach(groups) { group in
                                filterChip(group.name, isSelected: selectedGroupId == group.id) {
                                    selectedGroupId = group.id
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                    }
                }

                Divider().overlay(Color(.systemGray5))

                if loading {
                    ProgressView()
                        .padding(.top, 60)
                } else if posts.isEmpty {
                    VStack(spacing: 8) {
                        Text("No posts yet")
                            .foregroundStyle(.secondary)
                        Text("Create a group and start posting!")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                    .padding(.top, 60)
                } else {
                    LazyVStack(spacing: 0) {
                        ForEach(posts) { post in
                            PostCardView(
                                post: post,
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
            }
        }
        .navigationTitle("valyaint")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await refresh() }
        .task { await refresh() }
        .onChange(of: selectedGroupId) {
            Task {
                loading = true
                posts = []
                await fetchPosts()
            }
        }
    }

    private func filterChip(_ label: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.caption)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, 14)
                .padding(.vertical, 7)
                .background(isSelected ? .white : Color(.systemGray5))
                .foregroundStyle(isSelected ? .black : .white)
                .clipShape(Capsule())
        }
    }

    private func refresh() async {
        async let g: [Group] = APIClient.shared.get("/api/groups")
        groups = (try? await g) ?? []
        await fetchPosts()
    }

    private func fetchPosts(cursor: String? = nil) async {
        var query: [String: String] = [:]
        if let cursor { query["cursor"] = cursor }
        if !selectedGroupId.isEmpty { query["groupId"] = selectedGroupId }

        do {
            let response: FeedResponse = try await APIClient.shared.get("/api/feed", query: query)
            if cursor != nil {
                posts.append(contentsOf: response.posts)
            } else {
                posts = response.posts
            }
            nextCursor = response.nextCursor
        } catch {}
        loading = false
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
