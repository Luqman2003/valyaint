import SwiftUI

struct RegisterView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) var dismiss
    @State private var displayName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var error = ""
    @State private var loading = false

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            VStack(spacing: 8) {
                Text("valyaint")
                    .font(.system(size: 36, weight: .bold))
                Text("Create your account")
                    .foregroundStyle(.secondary)
            }

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

                TextField("Display name", text: $displayName)
                    .textContentType(.name)
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 14))

                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 14))

                SecureField("Password (min 8 characters)", text: $password)
                    .textContentType(.newPassword)
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 14))

                Button {
                    Task { await register() }
                } label: {
                    Text(loading ? "Creating account..." : "Create account")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(.white)
                        .foregroundStyle(.black)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .disabled(loading || displayName.isEmpty || email.isEmpty || password.count < 8)
                .opacity(loading ? 0.6 : 1)
            }

            Button("Already have an account? Sign in") {
                dismiss()
            }
            .font(.footnote)
            .foregroundStyle(.secondary)

            Spacer()
        }
        .padding(.horizontal, 24)
        .background(.black)
        .navigationBarBackButtonHidden()
        .preferredColorScheme(.dark)
    }

    private func register() async {
        loading = true
        error = ""
        do {
            try await authManager.register(email: email, password: password, displayName: displayName)
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }
}
