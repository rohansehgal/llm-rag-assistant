// components/PageWrapper.tsx

export default function PageWrapper({ children }: { children: React.ReactNode }) {
    return (
      <main className="w-full px-8 py-8">
        {children}
      </main>
    )
  }
  