const SonettoLogo = () => {
  return (
    <div className="flex items-center gap-2.5">
      {/* Minimal icon: abstract sound wave / recording symbol */}
      <div className="relative flex items-center justify-center w-8 h-8">
        <div className="absolute w-2 h-4 bg-primary rounded-full" />
        <div className="absolute w-3.5 h-6 border-2 border-primary rounded-full opacity-60" />
        <div className="absolute w-5 h-8 border-2 border-primary rounded-full opacity-30" />
      </div>
      <span className="text-lg font-semibold tracking-tight text-foreground">
        Sonetto
      </span>
    </div>
  );
};

export default SonettoLogo;
