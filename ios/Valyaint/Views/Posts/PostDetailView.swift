import SwiftUI

struct PostDetailView: View {
    let postId: String

    @State private var post: Post?
    @State private var comments: [Comment] = []
    @State private var newComment = ""
    @State private var submitting = false

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 0) {
                    if let post {
                        PostCardView(post: post)
                        Divider().overlay(Color(.systemGray5))

                        // Comments
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Comments (\(comments.count))")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .textCase(.uppercase)
                                .tracking(0.5)

                            ForEach(comments) { comment in
                                HStack(alignment: .top, spacing: 10) {
                                    AvatarView(name: comment.author.displayName, avatarUrl: comment.author.avatarUrl, size: 32)

                                    VStack(alignment: .leading, spacing: 4) {
                                        HStack(spacing: 6) {
                                            Text(comment.author.displayName)
                                                .font(.footnote.bold())
                                            Text(timeAgo(comment.createdAt))
                                                .font(.caption2)
                                                .foregroundStyle(.secondary)
                                        }
                                        Text(comment.content)
                                            .font(.footnote)
                                            .foregroundStyle(.secondary)
                                    }

                                    Spacer()
                                }
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                    } else {
                        ProgressView().padding(.top, 60)
                    }
                }
            }

            // Comment input
            HStack(spacing: 8) {
                TextField("Add a comment...", text: $newComment)
                    .textFieldStyle(.roundedBorder)

                Button {
                    Task { await submitComment() }
                } label: {
                    Text("Post")
                        .font(.footnote.bold())
                }
                .disabled(submitting || newComment.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding(12)
            .background(.ultraThinMaterial)
        }
        .navigationTitle("Post")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadPost() }
    }

    private func loadPost() async {
        do {
            post = try await APIClient.shared.get("/api/posts/\(postId)")
            comments = try await APIClient.shared.get("/api/posts/\(postId)/comments")
        } catch {}
    }

    private func submitComment() async {
        let trimmed = newComment.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }

        submitting = true
        do {
            let comment: Comment = try await APIClient.shared.post("/api/posts/\(postId)/comments", body: ["content": trimmed])
            comments.append(comment)
            newComment = ""
        } catch {}
        submitting = false
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
