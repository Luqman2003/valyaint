import Foundation

struct User: Codable, Identifiable {
    let id: String
    let email: String?
    let displayName: String
    let avatarUrl: String?
}

struct Group: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let inviteCode: String?
    let role: String?
    let memberCount: Int?
    let postCount: Int?
}

struct GroupDetail: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let inviteCode: String
    let role: String
    let memberships: [MembershipDetail]

    struct MembershipDetail: Codable, Identifiable {
        let id: String
        let role: String
        let user: User
    }
}

struct Post: Codable, Identifiable {
    let id: String
    let content: String?
    let createdAt: String
    let author: User
    let photos: [Photo]
    let _count: CommentCount
    let group: GroupRef

    struct CommentCount: Codable {
        let comments: Int
    }

    struct GroupRef: Codable {
        let id: String
        let name: String
    }
}

struct Photo: Codable, Identifiable {
    let id: String
    let url: String
}

struct Comment: Codable, Identifiable {
    let id: String
    let content: String
    let createdAt: String
    let author: User
    let replies: [Reply]?

    struct Reply: Codable, Identifiable {
        let id: String
        let content: String
        let createdAt: String
        let author: User
    }
}

struct FeedResponse: Codable {
    let posts: [Post]
    let nextCursor: String?
}

struct UploadResponse: Codable {
    let url: String
}

struct PresignResponse: Codable {
    let presignedUrl: String
    let publicUrl: String
    let key: String
}
