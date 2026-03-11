interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function PageLayout({ title, children }: PageLayoutProps) {
  return (
    <div className="page-layout">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
