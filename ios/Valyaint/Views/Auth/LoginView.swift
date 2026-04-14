import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var email = ""
    @State private var password = ""
    @State private var error = ""
    @State private var loading = false
    @State private var showRegister = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 32) {
                Spacer()

                VStack(spacing: 8) {
                    Text("valyaint")
                        .font(.system(size: 36, weight: .bold))
                    Text("Welcome back")
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

                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .padding()
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: 14))

                    SecureField("Password", text: $password)
                        .textContentType(.password)
                        .padding()
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: 14))

                    Button {
                        Task { await login() }
                    } label: {
                        Text(loading ? "Signing in..." : "Sign in")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(.white)
                            .foregroundStyle(.black)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .disabled(loading || email.isEmpty || password.isEmpty)
                    .opacity(loading ? 0.6 : 1)
                }

                Button("Don't have an account? Sign up") {
                    showRegister = true
                }
                .font(.footnote)
                .foregroundStyle(.secondary)

                Spacer()
            }
            .padding(.horizontal, 24)
            .background(.black)
            .navigationDestination(isPresented: $showRegister) {
                RegisterView()
                    .environmentObject(authManager)
            }
        }
        .preferredColorScheme(.dark)
    }

    private func login() async {
        loading = true
        error = ""
        do {
            try await authManager.login(email: email, password: password)
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }
}
