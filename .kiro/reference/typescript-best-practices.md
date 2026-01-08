# TypeScript Best Practices Reference

A comprehensive guide for TypeScript development in both frontend (React) and backend (Node.js) applications.

---

## Table of Contents

1. [TypeScript Configuration](#1-typescript-configuration)
2. [Type Definitions](#2-type-definitions)
3. [Interface Design](#3-interface-design)
4. [Generic Types](#4-generic-types)
5. [Utility Types](#5-utility-types)
6. [Error Handling](#6-error-handling)
7. [API Types](#7-api-types)
8. [React with TypeScript](#8-react-with-typescript)
9. [Node.js with TypeScript](#9-nodejs-with-typescript)
10. [Testing with TypeScript](#10-testing-with-typescript)
11. [Performance](#11-performance)
12. [Anti-Patterns](#12-anti-patterns)

---

## 1. TypeScript Configuration

### tsconfig.json Setup

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    
    // Strict type checking
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    
    // Path mapping
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/types/*": ["src/types/*"],
      "@/utils/*": ["src/utils/*"]
    }
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "build"
  ]
}
```

### Backend tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    
    // Node.js specific
    "types": ["node", "jest"],
    "moduleResolution": "node",
    
    // Strict checks
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    
    // Path mapping
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/types/*": ["src/types/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## 2. Type Definitions

### Basic Types

```typescript
// Primitive types
const name: string = 'Recipe Name';
const servings: number = 4;
const isVegetarian: boolean = true;
const tags: string[] = ['healthy', 'quick'];
const rating: number | null = null;

// Object types
const recipe: {
  id: number;
  name: string;
  servings: number;
  tags: string[];
} = {
  id: 1,
  name: 'Pasta',
  servings: 4,
  tags: ['italian'],
};

// Function types
type CalculateCalories = (ingredients: Ingredient[]) => number;
type AsyncRecipeFetcher = (id: number) => Promise<Recipe>;

// Union types
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type Status = 'loading' | 'success' | 'error';

// Literal types
type DifficultyLevel = 1 | 2 | 3 | 4 | 5;
type Theme = 'light' | 'dark';
```

### Complex Types

```typescript
// Tuple types
type Coordinate = [number, number]; // [lat, lng]
type NamedCoordinate = [number, number, string]; // [lat, lng, name]

// Enum types
enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
}

enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

// Const assertions for immutable data
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type MealType = typeof MEAL_TYPES[number]; // 'breakfast' | 'lunch' | 'dinner' | 'snack'

const API_ENDPOINTS = {
  RECIPES: '/api/recipes',
  USERS: '/api/users',
  MEAL_PLANS: '/api/meal-plans',
} as const;
```

---

## 3. Interface Design

### Core Domain Interfaces

```typescript
// Base interfaces
interface BaseEntity {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  dietaryPreferences: DietaryPreference[];
  role: UserRole;
}

interface Recipe extends BaseEntity {
  name: string;
  description?: string;
  ingredients: RecipeIngredient[];
  instructions: RecipeInstruction[];
  prepTime?: number; // minutes
  cookTime?: number; // minutes
  servings: number;
  difficulty: DifficultyLevel;
  cuisineType?: string;
  tags: string[];
  nutritionInfo?: NutritionInfo;
  userId: number;
  isPublic: boolean;
}

interface Ingredient extends BaseEntity {
  name: string;
  category: IngredientCategory;
  unitType: UnitType;
}

interface RecipeIngredient {
  id: number;
  recipeId: number;
  ingredientId: number;
  ingredient: Ingredient;
  amount: number;
  unit: string;
  notes?: string;
}

interface RecipeInstruction {
  id: number;
  recipeId: number;
  stepNumber: number;
  instruction: string;
  timeEstimate?: number; // minutes
}

interface MealPlan extends BaseEntity {
  name: string;
  userId: number;
  startDate: Date;
  endDate: Date;
  entries: MealPlanEntry[];
}

interface MealPlanEntry {
  id: number;
  mealPlanId: number;
  recipeId: number;
  recipe: Recipe;
  mealDate: Date;
  mealType: MealType;
  servings: number;
}
```

### Utility Interfaces

```typescript
// API Response interfaces
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface ApiError {
  success: false;
  error: {
    message: string;
    details?: ValidationError[];
    code?: string;
  };
}

interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Form interfaces
interface RecipeFormData {
  name: string;
  description: string;
  ingredients: IngredientFormData[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: DifficultyLevel;
  cuisineType: string;
  tags: string[];
}

interface IngredientFormData {
  ingredientId: number;
  amount: number;
  unit: string;
  notes?: string;
}

// Filter interfaces
interface RecipeFilters {
  search?: string;
  cuisineType?: string;
  maxPrepTime?: number;
  difficulty?: DifficultyLevel;
  tags?: string[];
  dietaryPreferences?: DietaryPreference[];
  page?: number;
  limit?: number;
}
```

### Optional vs Required Properties

```typescript
// Use optional properties judiciously
interface CreateRecipeRequest {
  name: string; // Required
  description?: string; // Optional
  ingredients: IngredientFormData[]; // Required
  instructions: string[]; // Required
  prepTime?: number; // Optional
  cookTime?: number; // Optional
  servings: number; // Required, has default
  difficulty?: DifficultyLevel; // Optional, has default
}

// Separate interfaces for different contexts
interface RecipeCreateData {
  name: string;
  description?: string;
  // ... other required fields for creation
}

interface RecipeUpdateData {
  name?: string;
  description?: string;
  // ... all fields optional for updates
}

interface RecipeResponse extends Recipe {
  // All fields present in response
  author: Pick<User, 'id' | 'firstName' | 'lastName'>;
  averageRating?: number;
  reviewCount: number;
}
```

---

## 4. Generic Types

### Generic Functions

```typescript
// Generic API functions
async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  const response = await fetch(url);
  return response.json();
}

// Usage
const recipes = await fetchData<Recipe[]>('/api/recipes');
const user = await fetchData<User>('/api/users/1');

// Generic with constraints
interface Identifiable {
  id: number;
}

function findById<T extends Identifiable>(items: T[], id: number): T | undefined {
  return items.find(item => item.id === id);
}

// Generic with multiple type parameters
function mapWithIndex<T, U>(
  items: T[],
  mapper: (item: T, index: number) => U
): U[] {
  return items.map(mapper);
}
```

### Generic Interfaces

```typescript
// Generic repository pattern
interface Repository<T extends BaseEntity> {
  findAll(filters?: Record<string, any>): Promise<T[]>;
  findById(id: number): Promise<T | null>;
  create(data: Omit<T, keyof BaseEntity>): Promise<T>;
  update(id: number, data: Partial<T>): Promise<T>;
  delete(id: number): Promise<void>;
}

// Implementation
class RecipeRepository implements Repository<Recipe> {
  async findAll(filters?: RecipeFilters): Promise<Recipe[]> {
    // Implementation
  }
  
  async findById(id: number): Promise<Recipe | null> {
    // Implementation
  }
  
  // ... other methods
}

// Generic service pattern
interface Service<T extends BaseEntity, CreateData, UpdateData> {
  getAll(filters?: Record<string, any>): Promise<T[]>;
  getById(id: number): Promise<T>;
  create(data: CreateData): Promise<T>;
  update(id: number, data: UpdateData): Promise<T>;
  delete(id: number): Promise<void>;
}
```

### Generic React Components

```typescript
// Generic list component
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
  emptyMessage?: string;
}

function List<T>({ items, renderItem, keyExtractor, emptyMessage }: ListProps<T>) {
  if (items.length === 0) {
    return <div>{emptyMessage || 'No items found'}</div>;
  }

  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  );
}

// Usage
<List
  items={recipes}
  renderItem={(recipe) => <RecipeCard recipe={recipe} />}
  keyExtractor={(recipe) => recipe.id}
  emptyMessage="No recipes found"
/>
```
---

## 5. Utility Types

### Built-in Utility Types

```typescript
// Partial - makes all properties optional
type UpdateRecipeData = Partial<Recipe>;

// Required - makes all properties required
type RequiredRecipeData = Required<RecipeFormData>;

// Pick - select specific properties
type RecipePreview = Pick<Recipe, 'id' | 'name' | 'prepTime' | 'cookTime'>;
type UserPublicInfo = Pick<User, 'id' | 'firstName' | 'lastName'>;

// Omit - exclude specific properties
type CreateRecipeData = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>;
type RecipeWithoutUser = Omit<Recipe, 'userId'>;

// Record - create object type with specific keys and values
type RecipesByCategory = Record<string, Recipe[]>;
type ValidationErrors = Record<string, string[]>;

// Exclude - exclude types from union
type NonAdminRoles = Exclude<UserRole, UserRole.ADMIN>; // 'user' | 'moderator'

// Extract - extract types from union
type AdminRole = Extract<UserRole, UserRole.ADMIN>; // 'admin'

// NonNullable - exclude null and undefined
type DefinitelyString = NonNullable<string | null | undefined>; // string

// ReturnType - get return type of function
type ApiResponseType = ReturnType<typeof fetchRecipes>; // Promise<Recipe[]>

// Parameters - get parameter types of function
type FetchRecipesParams = Parameters<typeof fetchRecipes>; // [RecipeFilters?]
```

### Custom Utility Types

```typescript
// Deep partial for nested objects
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Make specific properties optional
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type CreateUserData = PartialBy<User, 'id' | 'createdAt' | 'updatedAt'>;

// Make specific properties required
type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

type RecipeWithRequiredNutrition = RequiredBy<Recipe, 'nutritionInfo'>;

// Nullable type
type Nullable<T> = T | null;

// Optional fields for forms
type FormField<T> = {
  value: T;
  error?: string;
  touched: boolean;
};

type RecipeForm = {
  [K in keyof RecipeFormData]: FormField<RecipeFormData[K]>;
};

// API endpoint types
type ApiEndpoint<TRequest = void, TResponse = unknown> = {
  request: TRequest;
  response: TResponse;
};

type RecipeEndpoints = {
  getRecipes: ApiEndpoint<RecipeFilters, PaginatedResponse<Recipe>>;
  getRecipe: ApiEndpoint<{ id: number }, ApiResponse<Recipe>>;
  createRecipe: ApiEndpoint<CreateRecipeData, ApiResponse<Recipe>>;
  updateRecipe: ApiEndpoint<{ id: number; data: UpdateRecipeData }, ApiResponse<Recipe>>;
  deleteRecipe: ApiEndpoint<{ id: number }, ApiResponse<void>>;
};
```

### Conditional Types

```typescript
// Conditional type for API responses
type ApiResult<T> = T extends string 
  ? { message: T } 
  : T extends object 
    ? { data: T } 
    : never;

// Extract array element type
type ArrayElement<T> = T extends (infer U)[] ? U : never;
type RecipeType = ArrayElement<Recipe[]>; // Recipe

// Function overloads with conditional types
type FetchFunction = {
  <T extends 'recipe'>(type: T, id: number): Promise<Recipe>;
  <T extends 'user'>(type: T, id: number): Promise<User>;
  <T extends 'meal-plan'>(type: T, id: number): Promise<MealPlan>;
};

// Mapped types with conditions
type OptionalExcept<T, K extends keyof T> = {
  [P in keyof T]: P extends K ? T[P] : T[P] | undefined;
};

// Type guards
function isRecipe(item: Recipe | User | MealPlan): item is Recipe {
  return 'ingredients' in item;
}

function isApiError(response: ApiResponse<any> | ApiError): response is ApiError {
  return !response.success;
}
```

---

## 6. Error Handling

### Error Types

```typescript
// Base error class
abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;

  constructor(message: string, public readonly details?: any) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

// Specific error types
class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(message: string, public readonly validationErrors: ValidationErrorDetail[]) {
    super(message, validationErrors);
  }
}

class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly isOperational = true;

  constructor(resource: string, id?: string | number) {
    super(`${resource}${id ? ` with id ${id}` : ''} not found`);
  }
}

class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly isOperational = true;

  constructor(message = 'Unauthorized') {
    super(message);
  }
}

interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
}
```

### Result Pattern

```typescript
// Result type for error handling without exceptions
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Helper functions
function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}

// Usage in services
async function getRecipe(id: number): Promise<Result<Recipe, NotFoundError | ValidationError>> {
  try {
    if (id <= 0) {
      return failure(new ValidationError('Invalid recipe ID', [
        { field: 'id', message: 'ID must be positive' }
      ]));
    }

    const recipe = await recipeRepository.findById(id);
    if (!recipe) {
      return failure(new NotFoundError('Recipe', id));
    }

    return success(recipe);
  } catch (error) {
    return failure(error as ValidationError);
  }
}

// Using the result
const result = await getRecipe(1);
if (result.success) {
  console.log(result.data.name); // TypeScript knows this is Recipe
} else {
  console.error(result.error.message); // TypeScript knows this is an error
}
```

### Error Boundaries (React)

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} retry={this.retry} />;
      }

      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <button onClick={this.retry}>Try again</button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 7. API Types

### Request/Response Types

```typescript
// API request types
interface CreateRecipeRequest {
  name: string;
  description?: string;
  ingredients: {
    ingredientId: number;
    amount: number;
    unit: string;
    notes?: string;
  }[];
  instructions: string[];
  prepTime?: number;
  cookTime?: number;
  servings: number;
  difficulty?: DifficultyLevel;
  cuisineType?: string;
  tags: string[];
}

interface UpdateRecipeRequest extends Partial<CreateRecipeRequest> {}

interface GetRecipesRequest {
  page?: number;
  limit?: number;
  search?: string;
  cuisineType?: string;
  maxPrepTime?: number;
  difficulty?: DifficultyLevel;
  tags?: string[];
}

// API response types
interface RecipeResponse extends Recipe {
  author: {
    id: number;
    firstName: string;
    lastName: string;
  };
  averageRating: number;
  reviewCount: number;
  isFavorited?: boolean; // Only present for authenticated users
}

interface GetRecipesResponse {
  success: true;
  data: RecipeResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
```

### API Client Types

```typescript
// HTTP client interface
interface HttpClient {
  get<T>(url: string, config?: RequestConfig): Promise<T>;
  post<T>(url: string, data?: any, config?: RequestConfig): Promise<T>;
  put<T>(url: string, data?: any, config?: RequestConfig): Promise<T>;
  delete<T>(url: string, config?: RequestConfig): Promise<T>;
}

interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
}

// API service interface
interface RecipeApiService {
  getRecipes(filters?: GetRecipesRequest): Promise<GetRecipesResponse>;
  getRecipe(id: number): Promise<ApiResponse<RecipeResponse>>;
  createRecipe(data: CreateRecipeRequest): Promise<ApiResponse<RecipeResponse>>;
  updateRecipe(id: number, data: UpdateRecipeRequest): Promise<ApiResponse<RecipeResponse>>;
  deleteRecipe(id: number): Promise<ApiResponse<void>>;
}

// Implementation
class RecipeApi implements RecipeApiService {
  constructor(private httpClient: HttpClient) {}

  async getRecipes(filters?: GetRecipesRequest): Promise<GetRecipesResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }

    return this.httpClient.get<GetRecipesResponse>(
      `/api/recipes?${params.toString()}`
    );
  }

  async getRecipe(id: number): Promise<ApiResponse<RecipeResponse>> {
    return this.httpClient.get<ApiResponse<RecipeResponse>>(`/api/recipes/${id}`);
  }

  // ... other methods
}
```

### Type-safe API Routes

```typescript
// Define API routes with types
type ApiRoutes = {
  'GET /api/recipes': {
    query: GetRecipesRequest;
    response: GetRecipesResponse;
  };
  'GET /api/recipes/:id': {
    params: { id: string };
    response: ApiResponse<RecipeResponse>;
  };
  'POST /api/recipes': {
    body: CreateRecipeRequest;
    response: ApiResponse<RecipeResponse>;
  };
  'PUT /api/recipes/:id': {
    params: { id: string };
    body: UpdateRecipeRequest;
    response: ApiResponse<RecipeResponse>;
  };
  'DELETE /api/recipes/:id': {
    params: { id: string };
    response: ApiResponse<void>;
  };
};

// Type-safe request handler
type RequestHandler<T extends keyof ApiRoutes> = (
  req: Request & {
    params: 'params' extends keyof ApiRoutes[T] ? ApiRoutes[T]['params'] : {};
    query: 'query' extends keyof ApiRoutes[T] ? ApiRoutes[T]['query'] : {};
    body: 'body' extends keyof ApiRoutes[T] ? ApiRoutes[T]['body'] : {};
  },
  res: Response<ApiRoutes[T]['response']>
) => Promise<void> | void;

// Usage
const getRecipes: RequestHandler<'GET /api/recipes'> = async (req, res) => {
  // req.query is typed as GetRecipesRequest
  // res.json() expects GetRecipesResponse
  const recipes = await recipeService.getRecipes(req.query);
  res.json(recipes);
};
```

---

## 8. React with TypeScript

### Component Props

```typescript
// Basic component props
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  className?: string;
}

function Button({ children, onClick, variant = 'primary', disabled, className }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant} ${className || ''}`}
    >
      {children}
    </button>
  );
}

// Component with generic props
interface ListItemProps<T> {
  item: T;
  onSelect: (item: T) => void;
  renderContent: (item: T) => React.ReactNode;
  isSelected?: boolean;
}

function ListItem<T>({ item, onSelect, renderContent, isSelected }: ListItemProps<T>) {
  return (
    <div 
      className={`list-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(item)}
    >
      {renderContent(item)}
    </div>
  );
}

// Props with HTML attributes
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

function Input({ label, error, helperText, className, ...inputProps }: InputProps) {
  return (
    <div className="input-group">
      <label>{label}</label>
      <input 
        className={`input ${error ? 'error' : ''} ${className || ''}`}
        {...inputProps}
      />
      {error && <span className="error-text">{error}</span>}
      {helperText && <span className="helper-text">{helperText}</span>}
    </div>
  );
}
```

### Hooks with TypeScript

```typescript
// Custom hooks
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setStoredValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(value) : value;
      setValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  return [value, setStoredValue] as const;
}

// API hook
function useRecipes(filters?: RecipeFilters) {
  const [data, setData] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchRecipes() {
      try {
        setLoading(true);
        setError(null);
        const response = await recipeApi.getRecipes(filters);
        
        if (!cancelled) {
          setData(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchRecipes();

    return () => {
      cancelled = true;
    };
  }, [filters]);

  return { data, loading, error };
}

// Form hook
interface UseFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit: (values: T) => Promise<void> | void;
}

function useForm<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);

  const handleBlur = useCallback((name: keyof T) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    
    if (validate) {
      const validationErrors = validate(values);
      if (validationErrors[name]) {
        setErrors(prev => ({ ...prev, [name]: validationErrors[name] }));
      }
    }
  }, [values, validate]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate) {
      const validationErrors = validate(values);
      setErrors(validationErrors);
      
      if (Object.keys(validationErrors).length > 0) {
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await onSubmit(values);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate, onSubmit]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
  };
}
```

### Context with TypeScript

```typescript
// Auth context
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authApi.login({ email, password });
      setUser(response.data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    // Clear tokens, etc.
  }, []);

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```
---

## 9. Node.js with TypeScript

### Express with TypeScript

```typescript
// Type-safe Express setup
import express, { Request, Response, NextFunction } from 'express';

// Extend Request interface for custom properties
declare global {
  namespace Express {
    interface Request {
      user?: User;
      startTime?: number;
    }
  }
}

// Type-safe middleware
interface AuthenticatedRequest extends Request {
  user: User;
}

type AuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

const authenticate: AuthMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Type-safe route handlers
type RouteHandler<TRequest = {}, TResponse = any> = (
  req: Request & TRequest,
  res: Response<TResponse>,
  next: NextFunction
) => Promise<void> | void;

interface GetRecipesRequest {
  query: {
    page?: string;
    limit?: string;
    search?: string;
  };
}

const getRecipes: RouteHandler<GetRecipesRequest, GetRecipesResponse> = async (req, res) => {
  try {
    const filters: RecipeFilters = {
      page: req.query.page ? parseInt(req.query.page) : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : 10,
      search: req.query.search,
    };

    const recipes = await recipeService.getRecipes(filters);
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
};
```

### Database with TypeScript

```typescript
// Database connection with types
import { Pool, PoolClient, QueryResult } from 'pg';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
  idleTimeoutMillis?: number;
}

class Database {
  private pool: Pool;

  constructor(config: DatabaseConfig) {
    this.pool = new Pool(config);
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Query error', { text, error });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Repository pattern with types
interface Repository<T> {
  findAll(filters?: Record<string, any>): Promise<T[]>;
  findById(id: number): Promise<T | null>;
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: number, data: Partial<T>): Promise<T>;
  delete(id: number): Promise<void>;
}

class RecipeRepository implements Repository<Recipe> {
  constructor(private db: Database) {}

  async findAll(filters: RecipeFilters = {}): Promise<Recipe[]> {
    let query = 'SELECT * FROM recipes WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (filters.search) {
      query += ` AND (name ILIKE $${++paramCount} OR description ILIKE $${++paramCount})`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.cuisineType) {
      query += ` AND cuisine_type = $${++paramCount}`;
      params.push(filters.cuisineType);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${++paramCount}`;
      params.push(filters.limit);
    }

    if (filters.page && filters.limit) {
      const offset = (filters.page - 1) * filters.limit;
      query += ` OFFSET $${++paramCount}`;
      params.push(offset);
    }

    const result = await this.db.query<Recipe>(query, params);
    return result.rows;
  }

  async findById(id: number): Promise<Recipe | null> {
    const result = await this.db.query<Recipe>(
      'SELECT * FROM recipes WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async create(data: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>): Promise<Recipe> {
    const query = `
      INSERT INTO recipes (name, description, prep_time, cook_time, servings, user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const params = [
      data.name,
      data.description,
      data.prepTime,
      data.cookTime,
      data.servings,
      data.userId,
    ];

    const result = await this.db.query<Recipe>(query, params);
    return result.rows[0];
  }

  // ... other methods
}
```

### Service Layer with TypeScript

```typescript
// Service interfaces
interface RecipeService {
  getRecipes(filters: RecipeFilters): Promise<PaginatedResponse<Recipe>>;
  getRecipeById(id: number): Promise<Recipe>;
  createRecipe(data: CreateRecipeData, userId: number): Promise<Recipe>;
  updateRecipe(id: number, data: UpdateRecipeData, userId: number): Promise<Recipe>;
  deleteRecipe(id: number, userId: number): Promise<void>;
}

// Service implementation
class RecipeServiceImpl implements RecipeService {
  constructor(
    private recipeRepository: Repository<Recipe>,
    private ingredientRepository: Repository<Ingredient>
  ) {}

  async getRecipes(filters: RecipeFilters): Promise<PaginatedResponse<Recipe>> {
    const recipes = await this.recipeRepository.findAll(filters);
    const total = await this.getTotalCount(filters);

    return {
      success: true,
      data: recipes,
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 10,
        total,
        pages: Math.ceil(total / (filters.limit || 10)),
      },
    };
  }

  async getRecipeById(id: number): Promise<Recipe> {
    const recipe = await this.recipeRepository.findById(id);
    if (!recipe) {
      throw new NotFoundError('Recipe', id);
    }
    return recipe;
  }

  async createRecipe(data: CreateRecipeData, userId: number): Promise<Recipe> {
    // Validate ingredients exist
    for (const ingredient of data.ingredients) {
      const exists = await this.ingredientRepository.findById(ingredient.ingredientId);
      if (!exists) {
        throw new ValidationError('Invalid ingredient', [
          { field: 'ingredients', message: `Ingredient ${ingredient.ingredientId} not found` }
        ]);
      }
    }

    const recipeData = {
      ...data,
      userId,
    };

    return this.recipeRepository.create(recipeData);
  }

  // ... other methods

  private async getTotalCount(filters: RecipeFilters): Promise<number> {
    // Implementation to get total count
    return 0;
  }
}
```

---

## 10. Testing with TypeScript

### Jest Configuration

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

### Unit Tests

```typescript
// tests/services/recipeService.test.ts
import { RecipeServiceImpl } from '@/services/RecipeService';
import { Repository } from '@/types/Repository';
import { Recipe, Ingredient } from '@/types/models';
import { NotFoundError, ValidationError } from '@/utils/errors';

// Mock repositories
const mockRecipeRepository: jest.Mocked<Repository<Recipe>> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockIngredientRepository: jest.Mocked<Repository<Ingredient>> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('RecipeService', () => {
  let recipeService: RecipeServiceImpl;

  beforeEach(() => {
    recipeService = new RecipeServiceImpl(
      mockRecipeRepository,
      mockIngredientRepository
    );
    jest.clearAllMocks();
  });

  describe('getRecipeById', () => {
    it('should return recipe when found', async () => {
      const mockRecipe: Recipe = {
        id: 1,
        name: 'Test Recipe',
        description: 'A test recipe',
        ingredients: [],
        instructions: [],
        prepTime: 15,
        cookTime: 30,
        servings: 4,
        difficulty: 2,
        cuisineType: 'Italian',
        tags: ['test'],
        userId: 1,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRecipeRepository.findById.mockResolvedValue(mockRecipe);

      const result = await recipeService.getRecipeById(1);

      expect(result).toEqual(mockRecipe);
      expect(mockRecipeRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when recipe not found', async () => {
      mockRecipeRepository.findById.mockResolvedValue(null);

      await expect(recipeService.getRecipeById(999))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('createRecipe', () => {
    it('should create recipe with valid data', async () => {
      const createData = {
        name: 'New Recipe',
        description: 'A new recipe',
        ingredients: [{ ingredientId: 1, amount: 2, unit: 'cups' }],
        instructions: ['Step 1'],
        prepTime: 15,
        cookTime: 30,
        servings: 4,
        difficulty: 2 as const,
        cuisineType: 'Italian',
        tags: ['new'],
      };

      const mockIngredient: Ingredient = {
        id: 1,
        name: 'Flour',
        category: 'Baking',
        unitType: 'weight',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreatedRecipe: Recipe = {
        id: 1,
        ...createData,
        userId: 1,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockIngredientRepository.findById.mockResolvedValue(mockIngredient);
      mockRecipeRepository.create.mockResolvedValue(mockCreatedRecipe);

      const result = await recipeService.createRecipe(createData, 1);

      expect(result).toEqual(mockCreatedRecipe);
      expect(mockIngredientRepository.findById).toHaveBeenCalledWith(1);
      expect(mockRecipeRepository.create).toHaveBeenCalledWith({
        ...createData,
        userId: 1,
      });
    });

    it('should throw ValidationError for invalid ingredient', async () => {
      const createData = {
        name: 'New Recipe',
        ingredients: [{ ingredientId: 999, amount: 2, unit: 'cups' }],
        instructions: ['Step 1'],
        servings: 4,
        difficulty: 2 as const,
        tags: [],
      };

      mockIngredientRepository.findById.mockResolvedValue(null);

      await expect(recipeService.createRecipe(createData, 1))
        .rejects
        .toThrow(ValidationError);
    });
  });
});
```

### Integration Tests

```typescript
// tests/integration/recipes.test.ts
import request from 'supertest';
import { app } from '@/app';
import { Database } from '@/utils/database';
import { User, Recipe } from '@/types/models';

describe('Recipe API', () => {
  let db: Database;
  let testUser: User;
  let authToken: string;

  beforeAll(async () => {
    db = new Database({
      host: process.env.TEST_DB_HOST!,
      port: parseInt(process.env.TEST_DB_PORT!),
      database: process.env.TEST_DB_NAME!,
      user: process.env.TEST_DB_USER!,
      password: process.env.TEST_DB_PASSWORD!,
    });

    // Create test user and get auth token
    testUser = await createTestUser(db);
    authToken = generateAuthToken(testUser.id);
  });

  afterAll(async () => {
    await cleanupTestData(db);
    await db.close();
  });

  beforeEach(async () => {
    await cleanupRecipes(db);
  });

  describe('GET /api/recipes', () => {
    it('should return paginated recipes', async () => {
      // Create test recipes
      await createTestRecipes(db, testUser.id, 5);

      const response = await request(app)
        .get('/api/recipes?page=1&limit=3')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
            servings: expect.any(Number),
          }),
        ]),
        pagination: {
          page: 1,
          limit: 3,
          total: 5,
          pages: 2,
        },
      });

      expect(response.body.data).toHaveLength(3);
    });

    it('should filter recipes by search term', async () => {
      await createTestRecipe(db, testUser.id, { name: 'Chicken Pasta' });
      await createTestRecipe(db, testUser.id, { name: 'Beef Stew' });

      const response = await request(app)
        .get('/api/recipes?search=chicken')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Chicken Pasta');
    });
  });

  describe('POST /api/recipes', () => {
    it('should create a new recipe', async () => {
      const recipeData = {
        name: 'Test Recipe',
        description: 'A test recipe',
        ingredients: [
          { ingredientId: 1, amount: 2, unit: 'cups' },
        ],
        instructions: ['Mix ingredients', 'Cook'],
        prepTime: 15,
        cookTime: 30,
        servings: 4,
        difficulty: 2,
        cuisineType: 'Italian',
        tags: ['test'],
      };

      const response = await request(app)
        .post('/api/recipes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(recipeData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(Number),
          name: recipeData.name,
          userId: testUser.id,
        }),
      });
    });

    it('should return 401 without authentication', async () => {
      const recipeData = {
        name: 'Test Recipe',
        ingredients: [],
        instructions: [],
        servings: 4,
      };

      await request(app)
        .post('/api/recipes')
        .send(recipeData)
        .expect(401);
    });
  });
});

// Test helpers
async function createTestUser(db: Database): Promise<User> {
  const result = await db.query<User>(
    `INSERT INTO users (email, password_hash, first_name, last_name)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    ['test@example.com', 'hashedpassword', 'Test', 'User']
  );
  return result.rows[0];
}

async function createTestRecipe(
  db: Database,
  userId: number,
  overrides: Partial<Recipe> = {}
): Promise<Recipe> {
  const defaultData = {
    name: 'Test Recipe',
    description: 'A test recipe',
    servings: 4,
    difficulty: 2,
    ...overrides,
  };

  const result = await db.query<Recipe>(
    `INSERT INTO recipes (name, description, servings, difficulty, user_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [defaultData.name, defaultData.description, defaultData.servings, defaultData.difficulty, userId]
  );
  return result.rows[0];
}
```

---

## 11. Performance

### Type-only Imports

```typescript
// Use type-only imports when possible
import type { User, Recipe } from '@/types/models';
import type { ApiResponse } from '@/types/api';

// Regular import for runtime usage
import { validateEmail } from '@/utils/validation';

// Mixed imports
import { type ComponentProps, useState } from 'react';
```

### Lazy Loading Types

```typescript
// Lazy load heavy types
type LazyRecipeDetails = () => Promise<{
  nutritionInfo: NutritionInfo;
  reviews: Review[];
  relatedRecipes: Recipe[];
}>;

// Dynamic imports for code splitting
const RecipeEditor = lazy(() => import('@/components/RecipeEditor'));
const AdvancedFilters = lazy(() => import('@/components/AdvancedFilters'));
```

### Optimized Type Definitions

```typescript
// Use const assertions for better performance
const RECIPE_CATEGORIES = ['appetizer', 'main', 'dessert', 'beverage'] as const;
type RecipeCategory = typeof RECIPE_CATEGORIES[number];

// Prefer interfaces over type aliases for objects
interface Recipe {
  id: number;
  name: string;
  // ... other properties
}

// Use type aliases for unions and primitives
type Status = 'loading' | 'success' | 'error';
type ID = string | number;
```

---

## 12. Anti-Patterns

### Common Mistakes

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| `any` everywhere | No type safety | Use specific types |
| Overly complex types | Hard to understand | Break into smaller types |
| Missing null checks | Runtime errors | Use optional chaining |
| Ignoring strict mode | Weak type checking | Enable strict mode |
| Type assertions everywhere | Bypasses type checking | Use type guards |
| Huge interfaces | Hard to maintain | Split into smaller interfaces |

### Code Examples

```typescript
// BAD: Using any
function processData(data: any): any {
  return data.someProperty.map((item: any) => item.value);
}

// GOOD: Specific types
interface DataItem {
  value: string;
  id: number;
}

interface ProcessableData {
  someProperty: DataItem[];
}

function processData(data: ProcessableData): string[] {
  return data.someProperty.map(item => item.value);
}

// BAD: Type assertion without checking
const user = response.data as User;
console.log(user.email.toUpperCase()); // Might crash

// GOOD: Type guard
function isUser(obj: any): obj is User {
  return obj && typeof obj.email === 'string' && typeof obj.id === 'number';
}

if (isUser(response.data)) {
  console.log(response.data.email.toUpperCase()); // Safe
}

// BAD: Overly complex type
type ComplexType<T, U, V> = T extends string 
  ? U extends number 
    ? V extends boolean 
      ? { stringProp: T; numberProp: U; booleanProp: V }
      : never
    : never
  : never;

// GOOD: Simpler, more readable
interface SimpleConfig {
  stringProp: string;
  numberProp: number;
  booleanProp: boolean;
}

// BAD: Huge interface
interface MegaRecipe {
  // 50+ properties
  id: number;
  name: string;
  // ... many more properties
  nutritionCalories: number;
  nutritionProtein: number;
  // ... nutrition properties
  authorFirstName: string;
  authorLastName: string;
  // ... author properties
}

// GOOD: Composed interfaces
interface Recipe {
  id: number;
  name: string;
  description: string;
  nutrition: NutritionInfo;
  author: Author;
  // ... core recipe properties
}

interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Author {
  id: number;
  firstName: string;
  lastName: string;
}
```

---

## Quick Reference

### Common Type Patterns

```typescript
// Optional properties
interface User {
  id: number;
  name: string;
  email?: string; // Optional
}

// Union types
type Status = 'loading' | 'success' | 'error';

// Generic constraints
function process<T extends { id: number }>(item: T): T {
  return item;
}

// Conditional types
type ApiResponse<T> = T extends string ? { message: T } : { data: T };

// Mapped types
type Partial<T> = {
  [P in keyof T]?: T[P];
};

// Index signatures
interface StringDictionary {
  [key: string]: string;
}

// Function overloads
function createElement(tag: 'div'): HTMLDivElement;
function createElement(tag: 'span'): HTMLSpanElement;
function createElement(tag: string): HTMLElement;
```

### Utility Type Cheat Sheet

```typescript
Partial<T>          // Make all properties optional
Required<T>         // Make all properties required
Readonly<T>         // Make all properties readonly
Pick<T, K>          // Select specific properties
Omit<T, K>          // Exclude specific properties
Record<K, T>        // Create object type with specific keys
Exclude<T, U>       // Exclude types from union
Extract<T, U>       // Extract types from union
NonNullable<T>      // Exclude null and undefined
ReturnType<T>       // Get return type of function
Parameters<T>       // Get parameter types of function
```

---

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [Type Challenges](https://github.com/type-challenges/type-challenges)

---

This reference provides comprehensive TypeScript patterns and best practices for building type-safe, maintainable applications in both frontend and backend environments.