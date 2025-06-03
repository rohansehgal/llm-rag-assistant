// components/PageWrapper.tsx

export default function PageWrapper({ children }: { children: React.ReactNode }) {
    return (
      <main className="w-full max-w-5xl mx-auto px-6 py-8">
        {children}
      </main>
    )
  }
  