import { AppSidebar } from '@/components/AppSidebar';

type AccountLayoutProps = {
  children: React.ReactNode;
};

export const AccountLayout = ({ children }: AccountLayoutProps) => {
  return (
    <div className="bg-stage-glow min-h-screen md:flex">
      <AppSidebar />
      <div className="container mx-auto px-4 py-8 md:flex-1 md:py-10">{children}</div>
    </div>
  );
};
