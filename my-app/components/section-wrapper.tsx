import { ReactNode } from "react"

interface SectionWrapperProps {
  id?: string
  title?: string
  description?: string
  children: ReactNode
  className?: string
  background?: "default" | "muted" | "gradient"
}

export function SectionWrapper({ 
  id, 
  title, 
  description, 
  children, 
  className = "",
  background = "default"
}: SectionWrapperProps) {
  const backgroundClasses = {
    default: "",
    muted: "bg-muted/20",
    gradient: "bg-gradient-to-br from-primary/5 to-accent/5"
  }

  return (
    <section 
      id={id}
      className={`py-12 ${backgroundClasses[background]} ${className}`}
    >
      <div className="container mx-auto px-4">
        {(title || description) && (
          <div className="text-center mb-8">
            {title && (
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
            )}
            {description && (
              <p className="text-muted-foreground max-w-xl mx-auto">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}