import SwiftUI

struct PostCardView: View {
    let post: Post
    var showGroup: Bool = true
    var onEdit: ((String) -> Void)?
    var onDelete: (() -> Void)?
    var currentUserId: String?

    @State private var editing = false
    @State private var editContent = ""
    @State private var showMenu = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack(spacing: 10) {
                AvatarView(name: post.author.displayName, avatarUrl: post.author.avatarUrl, size: 40)

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(post.author.displayName)
                            .font(.subheadline.bold())
                        Text(timeAgo(post.createdAt))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    if showGroup {
                        Text(post.group.name)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                if post.author.id == currentUserId {
                    Menu {
                        Button("Edit") {
                            editContent = post.content ?? ""
                            editing = true
                        }
                        Button("Delete", role: .destructive) {
                            onDelete?()
                        }
                    } label: {
                        Image(systemName: "ellipsis")
                            .foregroundStyle(.secondary)
                            .padding(8)
                    }
                }
            }

            // Content
            if editing {
                VStack(spacing: 8) {
                    TextField("Edit post", text: $editContent, axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                        .lineLimit(3...10)

                    HStack {
                        Button("Cancel") {
                            editing = false
                        }
                        .foregroundStyle(.secondary)

                        Spacer()

                        Button("Save") {
                            onEdit?(editContent)
                            editing = false
                        }
                        .fontWeight(.semibold)
                    }
                    .font(.footnote)
                }
            } else if let content = post.content, !content.isEmpty {
                Text(content)
                    .font(.subheadline)
            }

            // Photos
            if !post.photos.isEmpty {
                if post.photos.count == 1 {
                    SinglePhotoView(url: fullPhotoURL(post.photos[0].url))
                } else {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 2), spacing: 4) {
                        ForEach(post.photos) { photo in
                            AsyncImage(url: URL(string: fullPhotoURL(photo.url))) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Rectangle().fill(Color(.systemGray5))
                            }
                            .aspectRatio(1, contentMode: .fill)
                            .clipped()
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                    }
                }
            }

            // Comment count
            NavigationLink(destination: PostDetailView(postId: post.id)) {
                Text(post._count.comments == 0 ? "Add a comment" : "\(post._count.comments) comment\(post._count.comments != 1 ? "s" : "")")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private func fullPhotoURL(_ path: String) -> String {
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

/// Adapts display based on image aspect ratio:
/// - Portrait/square: fills a 4:5 container (like BeReal)
/// - Landscape: fits within container width
private struct SinglePhotoView: View {
    let url: String
    @State private var loadedImage: UIImage?

    var body: some View {
        SwiftUI.Group {
            if let loadedImage {
                let ratio = loadedImage.size.width / loadedImage.size.height
                let isLandscape = ratio > 1.2

                Image(uiImage: loadedImage)
                    .resizable()
                    .aspectRatio(contentMode: isLandscape ? .fit : .fill)
                    .frame(maxWidth: .infinity)
                    .aspectRatio(isLandscape ? ratio : 4/5, contentMode: .fit)
                    .clipped()
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            } else {
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color(.systemGray5))
                    .aspectRatio(4/3, contentMode: .fit)
            }
        }
        .task { await loadImage() }
    }

    private func loadImage() async {
        guard let imageURL = URL(string: url) else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: imageURL)
            if let image = UIImage(data: data) {
                loadedImage = image
            }
        } catch {}
    }
}
