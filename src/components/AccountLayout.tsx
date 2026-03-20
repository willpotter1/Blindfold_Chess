import { AppSidebar } from '@/components/AppSidebar';

type AccountLayoutProps = {
  children: React.ReactNode;
};

export const AccountLayout = ({ children }: AccountLayoutProps) => {
  return (
    <div className="min-h-screen bg-white md:flex">
      <AppSidebar />
      <div className="container mx-auto px-4 py-10 md:flex-1">{children}</div>
    </div>
  );
};
