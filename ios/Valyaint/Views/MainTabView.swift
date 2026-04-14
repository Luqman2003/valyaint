import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                FeedView()
            }
            .tabItem {
                Label("Feed", systemImage: "house")
            }
            .tag(0)

            NavigationStack {
                GroupListView()
            }
            .tabItem {
                Label("Groups", systemImage: "person.3")
            }
            .tag(1)

            NavigationStack {
                CreatePostView(onPost: { selectedTab = 0 })
            }
            .tabItem {
                Label("Post", systemImage: "plus.circle.fill")
            }
            .tag(2)

            NavigationStack {
                NotificationsView()
            }
            .tabItem {
                Label("Activity", systemImage: "bell")
            }
            .tag(3)

            NavigationStack {
                ProfileView()
            }
            .tabItem {
                Label("Profile", systemImage: "person")
            }
            .tag(4)
        }
        .tint(.white)
        .preferredColorScheme(.dark)
    }
}
