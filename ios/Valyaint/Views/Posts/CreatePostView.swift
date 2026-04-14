import SwiftUI
import PhotosUI

struct CreatePostView: View {
    var groupId: String?
    var onPost: (() -> Void)?

    @State private var content = ""
    @State private var selectedGroup = ""
    @State private var groups: [Group] = []
    @State private var images: [UIImage] = []
    @State private var photoItems: [PhotosPickerItem] = []
    @State private var showCamera = false
    @State private var posting = false
    @State private var error = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                if !error.isEmpty {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .padding(12)
                        .frame(maxWidth: .infinity)
                        .background(.red.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                // Group selector (if not in a specific group)
                if groupId == nil && !groups.isEmpty {
                    Menu {
                        ForEach(groups) { group in
                            Button(group.name) {
                                selectedGroup = group.id
                            }
                        }
                    } label: {
                        HStack {
                            Text(groups.first { $0.id == selectedGroup }?.name ?? "Select group")
                                .foregroundStyle(selectedGroup.isEmpty ? .secondary : .primary)
                            Spacer()
                            Image(systemName: "chevron.down")
                                .foregroundStyle(.secondary)
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                }

                // Content
                TextField("What's on your mind?", text: $content, axis: .vertical)
                    .lineLimit(4...12)
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 14))

                // Photo previews
                if !images.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(images.indices, id: \.self) { i in
                                ZStack(alignment: .topTrailing) {
                                    Image(uiImage: images[i])
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                        .frame(width: 80, height: 80)
                                        .clipShape(RoundedRectangle(cornerRadius: 10))

                                    Button {
                                        images.remove(at: i)
                                    } label: {
                                        Image(systemName: "xmark.circle.fill")
                                            .font(.system(size: 18))
                                            .foregroundStyle(.white, .black.opacity(0.6))
                                    }
                                    .offset(x: 4, y: -4)
                                }
                            }
                        }
                    }
                }

                // Photo actions
                HStack(spacing: 12) {
                    PhotosPicker(selection: $photoItems, maxSelectionCount: 4 - images.count, matching: .images) {
                        Label("Library", systemImage: "photo.on.rectangle")
                            .font(.footnote)
                    }
                    .buttonStyle(.bordered)
                    .buttonBorderShape(.capsule)
                    .controlSize(.small)
                    .disabled(images.count >= 4)

                    Button {
                        showCamera = true
                    } label: {
                        Label("Camera", systemImage: "camera")
                            .font(.footnote)
                    }
                    .buttonStyle(.bordered)
                    .buttonBorderShape(.capsule)
                    .controlSize(.small)
                    .disabled(images.count >= 4)

                    Spacer()
                }

                // Post button
                Button {
                    Task { await submitPost() }
                } label: {
                    Text(posting ? "Posting..." : "Post")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(.white)
                        .foregroundStyle(.black)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .disabled(posting || (!content.isEmpty == false && images.isEmpty) || targetGroupId.isEmpty)
                .opacity(canPost ? 1 : 0.5)
            }
            .padding(24)
        }
        .navigationTitle("New Post")
        .fullScreenCover(isPresented: $showCamera) {
            CameraView { image in
                if images.count < 4 { images.append(image) }
            }
        }
        .onChange(of: photoItems) {
            Task { await loadPhotos() }
        }
        .task {
            if groupId == nil {
                groups = (try? await APIClient.shared.get("/api/groups") as [Group]) ?? []
                if let first = groups.first { selectedGroup = first.id }
            }
        }
        .onAppear {
            if let groupId { selectedGroup = groupId }
        }
    }

    private var targetGroupId: String {
        groupId ?? selectedGroup
    }

    private var canPost: Bool {
        !posting && (!content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !images.isEmpty) && !targetGroupId.isEmpty
    }

    private func loadPhotos() async {
        for item in photoItems {
            if let data = try? await item.loadTransferable(type: Data.self),
               let image = UIImage(data: data),
               images.count < 4 {
                images.append(image)
            }
        }
        photoItems = []
    }

    private func submitPost() async {
        posting = true
        error = ""

        // Upload photos first
        var photoUrls: [String] = []
        for image in images {
            guard let data = image.jpegData(compressionQuality: 1.0) else { continue }
            do {
                let url = try await APIClient.shared.uploadImage(imageData: data, filename: "photo.jpg")
                photoUrls.append(url)
            } catch {
                self.error = "Failed to upload photo"
                posting = false
                return
            }
        }

        // Create post
        var body: [String: Any] = [:]
        let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty { body["content"] = trimmed }
        if !photoUrls.isEmpty { body["photoUrls"] = photoUrls }

        do {
            let _: Post = try await APIClient.shared.post("/api/groups/\(targetGroupId)/posts", body: body)
            content = ""
            images = []
            onPost?()
        } catch {
            self.error = error.localizedDescription
        }
        posting = false
    }
}
