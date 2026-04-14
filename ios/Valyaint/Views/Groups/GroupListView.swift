import SwiftUI

struct GroupListView: View {
    @State private var groups: [Group] = []
    @State private var loading = true

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if loading {
                    ProgressView().padding(.top, 60)
                } else if groups.isEmpty {
                    VStack(spacing: 8) {
                        Text("No groups yet")
                            .foregroundStyle(.secondary)
                        Text("Create one or join with an invite link")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                    .padding(.top, 60)
                } else {
                    ForEach(groups) { group in
                        NavigationLink(destination: GroupDetailView(groupId: group.id)) {
                            GroupCardView(group: group)
                        }
                    }
                }
            }
            .padding(16)
        }
        .navigationTitle("Groups")
        .toolbar {
            if groups.count < 3 {
                NavigationLink(destination: CreateGroupView(onCreated: { loadGroups() })) {
                    Image(systemName: "plus")
                }
            }
        }
        .refreshable { loadGroups() }
        .task { loadGroups() }
    }

    private func loadGroups() {
        Task {
            do {
                groups = try await APIClient.shared.get("/api/groups")
            } catch {}
            loading = false
        }
    }
}

struct GroupCardView: View {
    let group: Group

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(group.name)
                    .font(.headline)
                Spacer()
                if group.role == "OWNER" {
                    Text("OWNER")
                        .font(.system(size: 9, weight: .semibold))
                        .tracking(0.5)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color(.systemGray4))
                        .clipShape(Capsule())
                }
            }

            if let desc = group.description, !desc.isEmpty {
                Text(desc)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            HStack(spacing: 16) {
                Label("\(group.memberCount ?? 0) members", systemImage: "person.2")
                Label("\(group.postCount ?? 0) posts", systemImage: "text.bubble")
            }
            .font(.caption)
            .foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
