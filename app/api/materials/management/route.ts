import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// Materials inventory and cost management
interface Material {
  id: string
  name: string
  type: 'filament' | 'resin' | 'support' | 'post_processing'
  cost_per_unit: number
  unit_type: 'gram' | 'ml' | 'piece'
  current_stock: number
  minimum_stock: number
  supplier: string
  supplier_part_number?: string
  last_purchase_price: number
  last_purchase_date: string
  average_cost: number
  properties: {
    density?: number
    color: string
    strength: number
    flexibility: number
    detail: number
    durability: number
  }
  storage_requirements?: string
  expiry_date?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface MaterialUsage {
  id: string
  material_id: string
  order_id: string
  quantity_used: number
  cost_at_time: number
  date_used: string
  notes?: string
}

interface MaterialPurchase {
  id: string
  material_id: string
  supplier: string
  quantity: number
  unit_cost: number
  total_cost: number
  purchase_date: string
  invoice_number?: string
  received_date?: string
  quality_rating?: number
  notes?: string
}

// GET /api/materials - Get materials with inventory status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status') // 'low_stock', 'out_of_stock', 'active'
    const include_usage = searchParams.get('include_usage') === 'true'

    // For now, return mock data with comprehensive material information
    // In production, this would query actual materials table
    const materials: Material[] = [
      {
        id: 'mat_001',
        name: 'Bambu PLA Basic - Black',
        type: 'filament',
        cost_per_unit: 0.045, // per gram
        unit_type: 'gram',
        current_stock: 15420, // grams
        minimum_stock: 5000,
        supplier: 'Bambu Lab',
        supplier_part_number: 'PLA-BK-1000',
        last_purchase_price: 45.00,
        last_purchase_date: '2024-01-15T00:00:00Z',
        average_cost: 0.043,
        properties: {
          density: 1.24,
          color: '#000000',
          strength: 4,
          flexibility: 3,
          detail: 4,
          durability: 3
        },
        storage_requirements: 'Cool, dry place. Avoid direct sunlight.',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z'
      },
      {
        id: 'mat_002',
        name: 'Bambu PETG - Clear',
        type: 'filament',
        cost_per_unit: 0.065,
        unit_type: 'gram',
        current_stock: 3200, // Below minimum!
        minimum_stock: 5000,
        supplier: 'Bambu Lab',
        supplier_part_number: 'PETG-CL-1000',
        last_purchase_price: 65.00,
        last_purchase_date: '2024-01-10T00:00:00Z',
        average_cost: 0.062,
        properties: {
          density: 1.27,
          color: 'transparent',
          strength: 5,
          flexibility: 4,
          detail: 4,
          durability: 5
        },
        storage_requirements: 'Vacuum sealed. Keep below 30°C.',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-10T00:00:00Z'
      },
      {
        id: 'mat_003',
        name: 'Bambu PVA Support',
        type: 'support',
        cost_per_unit: 0.25,
        unit_type: 'gram',
        current_stock: 1200,
        minimum_stock: 2000,
        supplier: 'Bambu Lab',
        supplier_part_number: 'PVA-SP-500',
        last_purchase_price: 125.00,
        last_purchase_date: '2024-01-05T00:00:00Z',
        average_cost: 0.23,
        properties: {
          density: 1.23,
          color: 'natural',
          strength: 1,
          flexibility: 1,
          detail: 5,
          durability: 1
        },
        storage_requirements: 'Vacuum sealed with desiccant. Moisture sensitive.',
        expiry_date: '2024-12-31T00:00:00Z',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-05T00:00:00Z'
      },
      {
        id: 'mat_004',
        name: 'Post-Processing Solution',
        type: 'post_processing',
        cost_per_unit: 2.50,
        unit_type: 'ml',
        current_stock: 450,
        minimum_stock: 200,
        supplier: 'Chemical Solutions Co.',
        last_purchase_price: 125.00,
        last_purchase_date: '2024-01-12T00:00:00Z',
        average_cost: 2.45,
        properties: {
          color: 'clear',
          strength: 0,
          flexibility: 0,
          detail: 0,
          durability: 0
        },
        storage_requirements: 'Ventilated area. Flammable - keep away from heat.',
        expiry_date: '2025-01-12T00:00:00Z',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-12T00:00:00Z'
      }
    ]

    let filteredMaterials = materials

    // Apply filters
    if (type) {
      filteredMaterials = filteredMaterials.filter(m => m.type === type)
    }

    if (status === 'low_stock') {
      filteredMaterials = filteredMaterials.filter(m => m.current_stock <= m.minimum_stock)
    } else if (status === 'out_of_stock') {
      filteredMaterials = filteredMaterials.filter(m => m.current_stock === 0)
    } else if (status === 'active') {
      filteredMaterials = filteredMaterials.filter(m => m.is_active)
    }

    // Calculate additional metrics
    const materialsWithMetrics = filteredMaterials.map(material => {
      const stockStatus = material.current_stock === 0 ? 'out_of_stock' :
                         material.current_stock <= material.minimum_stock ? 'low_stock' :
                         'in_stock'
      
      const stockValue = material.current_stock * material.average_cost
      const reorderQuantity = Math.max(0, (material.minimum_stock * 2) - material.current_stock)
      const daysOfStock = material.current_stock > 0 ? Math.floor(material.current_stock / 50) : 0 // Assuming 50 units/day usage

      return {
        ...material,
        stock_status: stockStatus,
        stock_value: Math.round(stockValue * 100) / 100,
        reorder_quantity: reorderQuantity,
        days_of_stock: daysOfStock,
        cost_variance: Math.round((material.last_purchase_price - material.average_cost) * 100) / 100
      }
    })

    const summary = {
      total_materials: materials.length,
      active_materials: materials.filter(m => m.is_active).length,
      low_stock_count: materials.filter(m => m.current_stock <= m.minimum_stock).length,
      out_of_stock_count: materials.filter(m => m.current_stock === 0).length,
      total_inventory_value: Math.round(materials.reduce((sum, m) => sum + (m.current_stock * m.average_cost), 0) * 100) / 100,
      materials_by_type: {
        filament: materials.filter(m => m.type === 'filament').length,
        resin: materials.filter(m => m.type === 'resin').length,
        support: materials.filter(m => m.type === 'support').length,
        post_processing: materials.filter(m => m.type === 'post_processing').length
      }
    }

    return NextResponse.json({
      success: true,
      materials: materialsWithMetrics,
      summary,
      filters: {
        type,
        status,
        include_usage
      }
    })

  } catch (error) {
    console.error('Materials GET error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// POST /api/materials - Add new material or update inventory
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { action, material_data, purchase_data, usage_data } = body

    switch (action) {
      case 'add_material':
        return handleAddMaterial(material_data, user.id)
      
      case 'update_stock':
        return handleUpdateStock(material_data, user.id)
      
      case 'record_purchase':
        return handleRecordPurchase(purchase_data, user.id)
      
      case 'record_usage':
        return handleRecordUsage(usage_data, user.id)
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action. Supported: add_material, update_stock, record_purchase, record_usage' 
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Materials POST error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

async function handleAddMaterial(materialData: any, userId: string) {
  // Validate required fields
  const requiredFields = ['name', 'type', 'cost_per_unit', 'unit_type', 'supplier']
  for (const field of requiredFields) {
    if (!materialData[field]) {
      return NextResponse.json({ 
        error: `Missing required field: ${field}` 
      }, { status: 400 })
    }
  }

  // In production, insert into materials table
  const newMaterial = {
    id: `mat_${Date.now()}`,
    ...materialData,
    current_stock: materialData.current_stock || 0,
    minimum_stock: materialData.minimum_stock || 0,
    average_cost: materialData.cost_per_unit,
    last_purchase_price: materialData.cost_per_unit,
    last_purchase_date: new Date().toISOString(),
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  return NextResponse.json({
    success: true,
    material: newMaterial,
    message: 'Material added successfully'
  })
}

async function handleUpdateStock(stockData: any, userId: string) {
  const { material_id, new_stock, reason, notes } = stockData

  if (!material_id || new_stock === undefined) {
    return NextResponse.json({ 
      error: 'material_id and new_stock are required' 
    }, { status: 400 })
  }

  // In production, update materials table and create stock movement record
  const stockMovement = {
    id: `mov_${Date.now()}`,
    material_id,
    previous_stock: 5000, // Would get from DB
    new_stock,
    quantity_changed: new_stock - 5000,
    reason: reason || 'manual_adjustment',
    notes,
    updated_by: userId,
    updated_at: new Date().toISOString()
  }

  return NextResponse.json({
    success: true,
    stock_movement: stockMovement,
    message: 'Stock updated successfully'
  })
}

async function handleRecordPurchase(purchaseData: any, userId: string) {
  const requiredFields = ['material_id', 'quantity', 'unit_cost', 'supplier']
  for (const field of requiredFields) {
    if (!purchaseData[field]) {
      return NextResponse.json({ 
        error: `Missing required field: ${field}` 
      }, { status: 400 })
    }
  }

  // Calculate new average cost
  const currentStock = 5000 // Would get from DB
  const currentAvgCost = 0.045 // Would get from DB
  const purchaseQuantity = purchaseData.quantity
  const purchaseCost = purchaseData.unit_cost

  const newAvgCost = ((currentStock * currentAvgCost) + (purchaseQuantity * purchaseCost)) / 
                     (currentStock + purchaseQuantity)

  const purchase = {
    id: `pur_${Date.now()}`,
    ...purchaseData,
    total_cost: purchaseData.quantity * purchaseData.unit_cost,
    purchase_date: new Date().toISOString(),
    recorded_by: userId
  }

  return NextResponse.json({
    success: true,
    purchase,
    new_average_cost: Math.round(newAvgCost * 10000) / 10000,
    new_stock: currentStock + purchaseQuantity,
    message: 'Purchase recorded successfully'
  })
}

async function handleRecordUsage(usageData: any, userId: string) {
  const requiredFields = ['material_id', 'order_id', 'quantity_used']
  for (const field of requiredFields) {
    if (!usageData[field]) {
      return NextResponse.json({ 
        error: `Missing required field: ${field}` 
      }, { status: 400 })
    }
  }

  const currentCost = 0.045 // Would get from DB
  const usage = {
    id: `use_${Date.now()}`,
    ...usageData,
    cost_at_time: currentCost,
    total_cost: usageData.quantity_used * currentCost,
    date_used: new Date().toISOString(),
    recorded_by: userId
  }

  return NextResponse.json({
    success: true,
    usage,
    message: 'Usage recorded successfully'
  })
}

// PUT /api/materials - Update material information
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { material_id, updates } = body

    if (!material_id) {
      return NextResponse.json({ 
        error: 'material_id is required' 
      }, { status: 400 })
    }

    // In production, update the materials table
    const updatedMaterial = {
      id: material_id,
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    }

    return NextResponse.json({
      success: true,
      material: updatedMaterial,
      message: 'Material updated successfully'
    })

  } catch (error) {
    console.error('Materials PUT error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
