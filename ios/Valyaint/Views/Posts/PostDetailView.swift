import SwiftUI

struct PostDetailView: View {
    let postId: String

    @State private var post: Post?
    @State private var comments: [Comment] = []
    @State private var newComment = ""
    @State private var submitting = false
    @State private var replyTo: (id: String, name: String)?
    @State private var expandedThreads: Set<String> = []

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 0) {
                    if let post {
                        PostCardView(post: post)
                        Divider().overlay(Color(.systemGray5))

                        VStack(alignment: .leading, spacing: 16) {
                            let total = comments.reduce(0) { $0 + 1 + ($1.replies?.count ?? 0) }
                            Text("Comments (\(total))")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .textCase(.uppercase)
                                .tracking(0.5)

                            ForEach(comments) { comment in
                                VStack(alignment: .leading, spacing: 10) {
                                    // Top-level comment
                                    commentRow(author: comment.author, content: comment.content, date: comment.createdAt)

                                    // Reply button
                                    Button {
                                        replyTo = (comment.id, comment.author.displayName)
                                    } label: {
                                        Text("Reply")
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                    }
                                    .padding(.leading, 42)

                                    // Replies
                                    let replies = comment.replies ?? []
                                    if !replies.isEmpty {
                                        if expandedThreads.contains(comment.id) {
                                            VStack(alignment: .leading, spacing: 10) {
                                                ForEach(replies) { reply in
                                                    commentRow(author: reply.author, content: reply.content, date: reply.createdAt, small: true)
                                                }
                                                Button {
                                                    expandedThreads.remove(comment.id)
                                                } label: {
                                                    Text("Hide replies")
                                                        .font(.caption2)
                                                        .foregroundStyle(.secondary)
                                                }
                                            }
                                            .padding(.leading, 42)
                                        } else {
                                            Button {
                                                expandedThreads.insert(comment.id)
                                            } label: {
                                                HStack(spacing: 6) {
                                                    Rectangle()
                                                        .fill(Color(.systemGray4))
                                                        .frame(width: 20, height: 1)
                                                    Text("View \(replies.count) repl\(replies.count == 1 ? "y" : "ies")")
                                                        .font(.caption2)
                                                        .foregroundStyle(.secondary)
                                                }
                                            }
                                            .padding(.leading, 42)
                                        }
                                    }
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
            VStack(spacing: 6) {
                if let replyTo {
                    HStack {
                        Text("Replying to \(replyTo.name)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        Spacer()
                        Button {
                            self.replyTo = nil
                        } label: {
                            Image(systemName: "xmark")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.horizontal, 12)
                }

                HStack(spacing: 8) {
                    TextField(replyTo != nil ? "Reply to \(replyTo!.name)..." : "Add a comment...", text: $newComment)
                        .textFieldStyle(.roundedBorder)

                    Button {
                        Task { await submitComment() }
                    } label: {
                        Text("Post")
                            .font(.footnote.bold())
                    }
                    .disabled(submitting || newComment.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .padding(.horizontal, 12)
                .padding(.bottom, 12)
            }
            .background(.ultraThinMaterial)
        }
        .navigationTitle("Post")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadPost() }
    }

    private func commentRow(author: User, content: String, date: String, small: Bool = false) -> some View {
        HStack(alignment: .top, spacing: 10) {
            AvatarView(name: author.displayName, avatarUrl: author.avatarUrl, size: small ? 24 : 32)

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(author.displayName)
                        .font(small ? .caption.bold() : .footnote.bold())
                    Text(timeAgo(date))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Text(content)
                    .font(small ? .caption : .footnote)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
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
        var body: [String: String] = ["content": trimmed]
        if let replyTo { body["parentId"] = replyTo.id }

        do {
            let comment: Comment = try await APIClient.shared.post("/api/posts/\(postId)/comments", body: body)
            if let replyTo {
                // Add reply to parent
                if let idx = comments.firstIndex(where: { $0.id == replyTo.id }) {
                    var updated = comments[idx]
                    let newReply = Comment.Reply(id: comment.id, content: comment.content, createdAt: comment.createdAt, author: comment.author)
                    var replies = updated.replies ?? []
                    replies.append(newReply)
                    // Recreate comment with updated replies
                    updated = Comment(id: updated.id, content: updated.content, createdAt: updated.createdAt, author: updated.author, replies: replies)
                    comments[idx] = updated
                    expandedThreads.insert(replyTo.id)
                }
            } else {
                comments.append(comment)
            }
            newComment = ""
            self.replyTo = nil
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
