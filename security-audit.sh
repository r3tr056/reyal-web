#!/bin/bash

# REYAL 3D Printing Platform - Security & Production Audit Script
# This script performs a comprehensive security and production readiness check

echo "==============================================="
echo "REYAL 3D Printing Platform Security Audit"
echo "==============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

echo "✅ Project root directory confirmed"

# Function to check environment variables
check_env_vars() {
    echo "🔍 Checking environment variable security..."
    
    # Check for sensitive data in .env files
    if [ -f ".env" ]; then
        echo "⚠️  Warning: .env file found in project root (should be .env.local for development)"
    fi
    
    if [ -f ".env.local" ]; then
        echo "✅ .env.local found for local development"
        
        # Check for common security issues
        if grep -q "password123\|admin\|test123" .env.local 2>/dev/null; then
            echo "❌ WARNING: Weak passwords detected in .env.local"
        fi
        
        if grep -q "localhost" .env.local 2>/dev/null; then
            echo "✅ Local development URLs detected"
        fi
    fi
    
    # Check .env.example
    if [ -f ".env.example" ]; then
        echo "✅ .env.example template found"
        
        # Ensure no real secrets in example
        if grep -q "sk_live\|pk_live\|password.*=" .env.example 2>/dev/null; then
            echo "❌ WARNING: Real secrets found in .env.example file"
        fi
    fi
    
    echo ""
}

# Function to check dependencies for vulnerabilities
check_dependencies() {
    echo "🔍 Checking dependencies for vulnerabilities..."
    
    # Check for npm audit
    if command -v npm &> /dev/null; then
        echo "Running npm audit..."
        npm audit --audit-level=high
        echo ""
    fi
    
    # Check package.json for outdated dependencies
    if grep -q '"react": "^19"' package.json; then
        echo "✅ Using React 19 (latest)"
    fi
    
    if grep -q '"next": "15' package.json; then
        echo "✅ Using Next.js 15+ (latest)"
    fi
    
    echo ""
}

# Function to check API routes security
check_api_security() {
    echo "🔍 Checking API route security..."
    
    # Check for proper error handling
    api_files=$(find app/api -name "*.ts" -o -name "*.js" 2>/dev/null)
    
    for file in $api_files; do
        if [ -f "$file" ]; then
            # Check for authentication checks
            if grep -q "auth\|getUser\|jwt" "$file"; then
                echo "✅ Authentication found in $(basename $file)"
            else
                echo "⚠️  No authentication detected in $(basename $file)"
            fi
            
            # Check for proper error handling
            if grep -q "try.*catch\|\.catch" "$file"; then
                echo "✅ Error handling found in $(basename $file)"
            else
                echo "⚠️  Limited error handling in $(basename $file)"
            fi
        fi
    done
    
    echo ""
}

# Function to check configuration files
check_config_files() {
    echo "🔍 Checking configuration files..."
    
    # Check next.config.mjs
    if [ -f "next.config.mjs" ]; then
        echo "✅ Next.js config found"
        
        if grep -q "ignoreBuildErrors.*true" next.config.mjs; then
            echo "⚠️  WARNING: TypeScript build errors are ignored"
        fi
        
        if grep -q "eslint.*ignoreDuringBuilds.*true" next.config.mjs; then
            echo "⚠️  WARNING: ESLint is disabled during builds"
        fi
        
        if grep -q "images.*unoptimized.*true" next.config.mjs; then
            echo "⚠️  WARNING: Image optimization is disabled"
        fi
    fi
    
    # Check vercel.json
    if [ -f "vercel.json" ]; then
        echo "✅ Vercel configuration found"
        
        if grep -q "X-Frame-Options" vercel.json; then
            echo "✅ Security headers configured"
        else
            echo "⚠️  Security headers missing in vercel.json"
        fi
    fi
    
    # Check tailwind.config.ts
    if [ -f "tailwind.config.ts" ]; then
        echo "✅ Tailwind config found"
    fi
    
    echo ""
}

# Function to check file permissions and structure
check_file_structure() {
    echo "🔍 Checking file structure and permissions..."
    
    # Check for sensitive files
    sensitive_files=(".env" ".env.production" "private.key" "id_rsa" ".secrets")
    
    for file in "${sensitive_files[@]}"; do
        if [ -f "$file" ]; then
            echo "❌ WARNING: Sensitive file '$file' found in repository"
        fi
    done
    
    # Check .gitignore
    if [ -f ".gitignore" ]; then
        echo "✅ .gitignore found"
        
        # Check if important files are ignored
        ignore_items=(".env.local" "node_modules" ".next" "dist")
        for item in "${ignore_items[@]}"; do
            if grep -q "$item" .gitignore; then
                echo "✅ $item is properly ignored"
            else
                echo "⚠️  $item should be added to .gitignore"
            fi
        done
    fi
    
    echo ""
}

# Function to check TypeScript configuration
check_typescript() {
    echo "🔍 Checking TypeScript configuration..."
    
    if [ -f "tsconfig.json" ]; then
        echo "✅ TypeScript config found"
        
        if grep -q '"strict": true' tsconfig.json; then
            echo "✅ Strict mode enabled"
        else
            echo "⚠️  Consider enabling strict mode for better type safety"
        fi
    fi
    
    echo ""
}

# Function to check build output
check_build() {
    echo "🔍 Checking build configuration..."
    
    if [ -d ".next" ]; then
        echo "✅ Build directory exists"
        
        # Check build size
        build_size=$(du -sh .next 2>/dev/null | cut -f1)
        echo "📦 Build size: $build_size"
    fi
    
    echo ""
}

# Function to check database schema
check_database() {
    echo "🔍 Checking database configuration..."
    
    if [ -f "database-setup.sql" ]; then
        echo "✅ Database setup script found"
        
        # Check for RLS
        if grep -q "ENABLE ROW LEVEL SECURITY" database-setup.sql; then
            echo "✅ Row Level Security enabled"
        else
            echo "❌ WARNING: Row Level Security not found"
        fi
        
        # Check for proper policies
        if grep -q "CREATE POLICY" database-setup.sql; then
            echo "✅ Security policies defined"
        else
            echo "❌ WARNING: No security policies found"
        fi
    fi
    
    echo ""
}

# Function to generate security report
generate_report() {
    echo "==============================================="
    echo "SECURITY AUDIT SUMMARY"
    echo "==============================================="
    
    echo "🔒 Security Checks Completed:"
    echo "   ✅ Environment variables"
    echo "   ✅ Dependencies"
    echo "   ✅ API routes"
    echo "   ✅ Configuration files"
    echo "   ✅ File structure"
    echo "   ✅ TypeScript configuration"
    echo "   ✅ Build configuration"
    echo "   ✅ Database security"
    
    echo ""
    echo "📋 Recommended Actions:"
    echo "   1. Review all ⚠️  warnings above"
    echo "   2. Update any outdated dependencies"
    echo "   3. Ensure proper environment variables in production"
    echo "   4. Test all API endpoints with authentication"
    echo "   5. Verify database policies work correctly"
    echo "   6. Run E2E tests before deployment"
    
    echo ""
    echo "🚀 Production Readiness Status:"
    
    # Count warnings (this is a simplified check)
    warning_count=$(grep -c "⚠️\|❌" /tmp/audit.log 2>/dev/null || echo "0")
    
    if [ "$warning_count" -lt 3 ]; then
        echo "   ✅ READY FOR PRODUCTION"
    else
        echo "   ⚠️  NEEDS ATTENTION BEFORE PRODUCTION"
    fi
    
    echo ""
}

# Main execution
main() {
    # Redirect output to both console and log file
    exec > >(tee /tmp/audit.log)
    
    check_env_vars
    check_dependencies
    check_api_security
    check_config_files
    check_file_structure
    check_typescript
    check_build
    check_database
    generate_report
}

# Run the audit
main