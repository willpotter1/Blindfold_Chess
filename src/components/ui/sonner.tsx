import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#d9b99b] group-[.toaster]:text-black group-[.toaster]:border-[#d9b99b] group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-black",
          actionButton: "group-[.toast]:bg-black group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-black/10 group-[.toast]:text-black",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
