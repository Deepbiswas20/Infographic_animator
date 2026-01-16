import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge CSS class names with Tailwind CSS conflict resolution
 * 
 * This function combines clsx for conditional class names with tailwind-merge
 * to handle Tailwind CSS class conflicts intelligently. It ensures that
 * conflicting utility classes are properly resolved (e.g., 'p-4 p-6' becomes 'p-6').
 * 
 * @param inputs - Variable number of class values (strings, objects, arrays, etc.)
 * @returns A string of merged and deduplicated CSS classes
 * 
 * @example
 * ```typescript
 * cn('px-2 py-1', 'px-3') // Returns: 'py-1 px-3'
 * cn('text-red-500', { 'text-blue-500': isActive }) // Conditional classes
 * cn(['bg-white', 'shadow-lg'], undefined, 'rounded-md') // Mixed inputs
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Type guard to check if a value is a non-empty string
 * 
 * @param value - The value to check
 * @returns True if the value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Safely formats a class name string by removing extra whitespace
 * and filtering out empty values
 * 
 * @param className - The class name string to format
 * @returns A clean, formatted class name string
 */
export function formatClassName(className: string | undefined | null): string {
  if (!className) return '';
  return className
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

/**
 * Creates a conditional class name based on a boolean condition
 * 
 * @param condition - Boolean condition to evaluate
 * @param trueClass - Class name(s) to apply when condition is true
 * @param falseClass - Class name(s) to apply when condition is false (optional)
 * @returns The appropriate class name string
 * 
 * @example
 * ```typescript
 * conditionalClass(isActive, 'bg-blue-500', 'bg-gray-500')
 * conditionalClass(isDisabled, 'opacity-50 cursor-not-allowed')
 * ```
 */
export function conditionalClass(
  condition: boolean,
  trueClass: string,
  falseClass?: string
): string {
  return condition ? trueClass : falseClass || '';
}

/**
 * Merges component variants with base classes
 * Useful for component libraries with variant-based styling
 * 
 * @param base - Base class names that are always applied
 * @param variants - Object containing variant class names
 * @param activeVariants - Object specifying which variants are active
 * @returns Merged class name string
 * 
 * @example
 * ```typescript
 * const buttonClasses = mergeVariants(
 *   'px-4 py-2 rounded font-medium',
 *   {
 *     size: { sm: 'text-sm', md: 'text-base', lg: 'text-lg' },
 *     variant: { primary: 'bg-blue-500 text-white', secondary: 'bg-gray-200' }
 *   },
 *   { size: 'md', variant: 'primary' }
 * );
 * ```
 */
export function mergeVariants<T extends Record<string, Record<string, string>>>(
  base: string,
  variants: T,
  activeVariants: Partial<{ [K in keyof T]: keyof T[K] }>
): string {
  const variantClasses = Object.entries(activeVariants)
    .map(([key, value]) => {
      const variant = variants[key];
      return variant && value ? variant[value as string] : '';
    })
    .filter(Boolean);

  return cn(base, ...variantClasses);
}

/**
 * Type definition for responsive class configuration
 */
export type ResponsiveClass = {
  base?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  '2xl'?: string;
};

/**
 * Generates responsive class names from a configuration object
 * 
 * @param config - Object containing responsive class configurations
 * @returns A string of responsive class names
 * 
 * @example
 * ```typescript
 * const responsiveClasses = createResponsiveClasses({
 *   base: 'text-sm',
 *   md: 'text-base',
 *   lg: 'text-lg'
 * }); // Returns: 'text-sm md:text-base lg:text-lg'
 * ```
 */
export function createResponsiveClasses(config: ResponsiveClass): string {
  const { base, ...responsive } = config;
  
  const responsiveClasses = Object.entries(responsive)
    .map(([breakpoint, className]) => 
      className ? `${breakpoint}:${className}` : ''
    )
    .filter(Boolean);

  return cn(base, ...responsiveClasses);
}
