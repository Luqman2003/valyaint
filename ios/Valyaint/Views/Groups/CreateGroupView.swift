import SwiftUI

struct CreateGroupView: View {
    @Environment(\.dismiss) var dismiss
    var onCreated: (() -> Void)?

    @State private var name = ""
    @State private var description = ""
    @State private var error = ""
    @State private var loading = false

    var body: some View {
        VStack(spacing: 20) {
            VStack(spacing: 16) {
                if !error.isEmpty {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .padding(12)
                        .frame(maxWidth: .infinity)
                        .background(.red.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                TextField("Group name", text: $name)
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 14))

                TextField("Description (optional)", text: $description, axis: .vertical)
                    .lineLimit(3...6)
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }

            Button {
                Task { await create() }
            } label: {
                Text(loading ? "Creating..." : "Create group")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(.white)
                    .foregroundStyle(.black)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .disabled(loading || name.isEmpty)

            Spacer()
        }
        .padding(24)
        .navigationTitle("Create Group")
    }

    private func create() async {
        loading = true
        error = ""
        var body: [String: Any] = ["name": name]
        if !description.isEmpty { body["description"] = description }

        do {
            let _: Group = try await APIClient.shared.post("/api/groups", body: body)
            onCreated?()
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }
}
