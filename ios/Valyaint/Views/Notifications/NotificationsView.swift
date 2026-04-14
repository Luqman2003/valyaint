import SwiftUI

struct NotificationsView: View {
    var body: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "bell")
                .font(.system(size: 40))
                .foregroundStyle(.tertiary)
            Text("No activity yet")
                .font(.headline)
                .foregroundStyle(.secondary)
            Text("Notifications for comments and group updates will show up here")
                .font(.caption)
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.center)
            Spacer()
        }
        .padding(24)
        .navigationTitle("Activity")
    }
}
