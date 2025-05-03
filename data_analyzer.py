import pandas as pd
import numpy as np
import json

def analyze_sales_data(df):
    """Analyze the sales data and extract key metrics"""
    metrics = {}
    
    # Ensure the dataframe is not empty
    if df.empty:
        return {"error": "No data available for the specified filters"}
    
    # 1. Calculate total sales metrics
    metrics["total_revenue"] = float(df["Revenue"].sum())
    metrics["total_units_sold"] = int(df["Units Sold"].sum())
    metrics["average_unit_price"] = float(metrics["total_revenue"] / metrics["total_units_sold"])
    
    # 2. Time-based analysis (if date column exists)
    if "Date" in df.columns:
        # Create a deep copy to avoid the SettingWithCopyWarning
        df_copy = df.copy(deep=True)
        df_copy["Month"] = df_copy["Date"].dt.to_period("M")
        
        monthly_sales = df_copy.groupby("Month").agg({"Revenue": "sum", "Units Sold": "sum"})
        
        # Calculate month-over-month growth if we have at least 2 months of data
        if len(monthly_sales) >= 2:
            monthly_sales["Revenue_Growth"] = monthly_sales["Revenue"].pct_change() * 100
            monthly_sales["Units_Growth"] = monthly_sales["Units Sold"].pct_change() * 100
            
            latest_month = monthly_sales.index[-1]
            previous_month = monthly_sales.index[-2]
            
            metrics["latest_month"] = str(latest_month)
            metrics["previous_month"] = str(previous_month)
            metrics["revenue_growth"] = float(monthly_sales.loc[latest_month, "Revenue_Growth"])
            metrics["units_growth"] = float(monthly_sales.loc[latest_month, "Units_Growth"])
            
            # Convert Period objects to strings for JSON serialization
            metrics["monthly_data"] = {
                str(month): {
                    "revenue": float(row["Revenue"]),
                    "units_sold": int(row["Units Sold"]),
                    "revenue_growth": float(row.get("Revenue_Growth", np.nan)) if not pd.isna(row.get("Revenue_Growth", np.nan)) else None,
                    "units_growth": float(row.get("Units_Growth", np.nan)) if not pd.isna(row.get("Units_Growth", np.nan)) else None
                }
                for month, row in monthly_sales.iterrows()
            }
    
    # 3. Top products analysis
    top_products = df.groupby("Product Name").agg({
        "Revenue": "sum",
        "Units Sold": "sum"
    }).sort_values("Revenue", ascending=False)
    
    # Convert DataFrame to dict and ensure all values are JSON serializable
    top_products_dict = {}
    for product_name, row in top_products.head(5).iterrows():
        top_products_dict[product_name] = {
            "Revenue": float(row["Revenue"]),
            "Units Sold": int(row["Units Sold"])
        }
    
    metrics["top_products"] = top_products_dict
    metrics["top_product_name"] = str(top_products.index[0]) if not top_products.empty else ""
    
    if not top_products.empty:
        metrics["top_product_revenue"] = float(top_products.iloc[0]["Revenue"])
        metrics["top_product_units"] = int(top_products.iloc[0]["Units Sold"])
        metrics["top_product_revenue_percentage"] = float((top_products.iloc[0]["Revenue"] / metrics["total_revenue"]) * 100)
    
    # 4. Inventory analysis (if inventory data exists)
    if "Inventory Level" in df.columns:
        current_inventory = df.groupby("Product Name")["Inventory Level"].last()
        
        # Convert to regular Python types for JSON serialization
        low_stock_items = {}
        for product, level in current_inventory[current_inventory < 10].items():
            low_stock_items[str(product)] = int(level)
        
        metrics["low_stock_items"] = low_stock_items
        
        # Products that need restocking (where inventory is less than average monthly sales)
        if "Month" in df_copy.columns:
            latest_month = df_copy["Month"].max()
            latest_data = df_copy[df_copy["Month"] == latest_month]
            
            monthly_sales_by_product = latest_data.groupby("Product Name")["Units Sold"].sum()
            
            # Products where inventory is less than monthly sales
            restock_needed = []
            for product, inv_level in current_inventory.items():
                if product in monthly_sales_by_product:
                    monthly_sales = monthly_sales_by_product[product]
                    if inv_level < monthly_sales:
                        restock_needed.append({
                            "product": str(product),
                            "current_inventory": int(inv_level),
                            "monthly_sales": int(monthly_sales),
                            "coverage_ratio": float(inv_level / monthly_sales) if monthly_sales > 0 else float('inf')
                        })
            
            metrics["restock_needed"] = sorted(restock_needed, key=lambda x: x["coverage_ratio"])
    
    # 5. Category analysis
    if "Category" in df.columns:
        category_sales = df.groupby("Category").agg({
            "Revenue": "sum", 
            "Units Sold": "sum"
        }).sort_values("Revenue", ascending=False)
        
        # Convert to dict with native Python types
        category_dict = {}
        for category, row in category_sales.iterrows():
            category_dict[str(category)] = {
                "Revenue": float(row["Revenue"]),
                "Units Sold": int(row["Units Sold"])
            }
        
        metrics["category_performance"] = category_dict
        metrics["top_category"] = str(category_sales.index[0]) if not category_sales.empty else ""
        
        if not category_sales.empty:
            metrics["top_category_revenue"] = float(category_sales.iloc[0]["Revenue"])
            metrics["top_category_percentage"] = float((category_sales.iloc[0]["Revenue"] / metrics["total_revenue"]) * 100)
    
    # 6. Regional analysis
    if "Region" in df.columns:
        region_sales = df.groupby("Region").agg({
            "Revenue": "sum", 
            "Units Sold": "sum"
        }).sort_values("Revenue", ascending=False)
        
        # Convert to dict with native Python types
        region_dict = {}
        for region, row in region_sales.iterrows():
            region_dict[str(region)] = {
                "Revenue": float(row["Revenue"]),
                "Units Sold": int(row["Units Sold"])
            }
        
        metrics["region_performance"] = region_dict
        metrics["top_region"] = str(region_sales.index[0]) if not region_sales.empty else ""
        
        if not region_sales.empty:
            metrics["top_region_revenue"] = float(region_sales.iloc[0]["Revenue"])
            metrics["top_region_percentage"] = float((region_sales.iloc[0]["Revenue"] / metrics["total_revenue"]) * 100)
    
    # Ensure all values are JSON serializable
    for key, value in list(metrics.items()):
        if isinstance(value, np.integer):
            metrics[key] = int(value)
        elif isinstance(value, np.floating):
            metrics[key] = float(value)
        elif isinstance(value, np.ndarray):
            metrics[key] = value.tolist()
    
    return metrics
