import SwiftUI

struct AvatarView: View {
    let name: String
    let avatarUrl: String?
    let size: CGFloat

    var body: some View {
        if let avatarUrl, let url = URL(string: fullURL(avatarUrl)) {
            AsyncImage(url: url) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                initialsView
            }
            .frame(width: size, height: size)
            .clipShape(Circle())
        } else {
            initialsView
        }
    }

    private var initialsView: some View {
        Circle()
            .fill(Color(.systemGray4))
            .frame(width: size, height: size)
            .overlay {
                Text(String(name.prefix(1)).uppercased())
                    .font(.system(size: size * 0.4, weight: .bold))
                    .foregroundStyle(.white)
            }
    }

    private func fullURL(_ path: String) -> String {
        if path.hasPrefix("http") { return path }
        #if targetEnvironment(simulator)
        return "http://localhost:3000\(path)"
        #else
        return "http://10.0.0.151:3000\(path)"
        #endif
    }
}
