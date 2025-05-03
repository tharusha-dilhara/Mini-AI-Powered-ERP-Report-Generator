import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta
import random

def generate_mock_sales_data():
    """Generate mock sales data for testing the ERP Report Generator"""
    
    # Create directory for data if it doesn't exist
    os.makedirs("data", exist_ok=True)
    
    # Seed for reproducibility
    np.random.seed(42)
    
    # Parameters
    start_date = datetime(2023, 1, 1)
    end_date = datetime.now()
    num_days = (end_date - start_date).days
    
    # Lists of sample products, categories, and regions
    products = {
        "Laptop Pro": {"category": "Electronics", "base_price": 1200, "base_inventory": 80},
        "SmartPhone X": {"category": "Electronics", "base_price": 800, "base_inventory": 120},
        "Wireless Earbuds": {"category": "Electronics", "base_price": 150, "base_inventory": 200},
        "Office Desk": {"category": "Furniture", "base_price": 350, "base_inventory": 50},
        "Ergonomic Chair": {"category": "Furniture", "base_price": 250, "base_inventory": 70},
        "Coffee Table": {"category": "Furniture", "base_price": 180, "base_inventory": 40},
        "Running Shoes": {"category": "Apparel", "base_price": 120, "base_inventory": 150},
        "Designer Jeans": {"category": "Apparel", "base_price": 90, "base_inventory": 200},
        "Winter Jacket": {"category": "Apparel", "base_price": 160, "base_inventory": 100},
        "Protein Powder": {"category": "Health", "base_price": 40, "base_inventory": 300},
        "Multivitamins": {"category": "Health", "base_price": 25, "base_inventory": 400},
        "Yoga Mat": {"category": "Health", "base_price": 35, "base_inventory": 120},
    }
    
    regions = ["North", "South", "East", "West", "Central"]
    
    # Generate data
    dates = []
    product_names = []
    units_sold = []
    revenues = []
    inventory_levels = []
    categories = []
    regions_list = []
    
    # Simulate seasonal trends and random events
    for day in range(num_days):
        current_date = start_date + timedelta(days=day)
        
        # Number of transactions for this day (with weekend effect)
        if current_date.weekday() >= 5:  # Weekend
            daily_transactions = np.random.randint(10, 20)
        else:  # Weekday
            daily_transactions = np.random.randint(15, 30)
        
        # Seasonal factor (higher sales in Q4, lower in Q1)
        month = current_date.month
        if 10 <= month <= 12:  # Q4
            seasonal_factor = 1.3
        elif 1 <= month <= 3:  # Q1
            seasonal_factor = 0.8
        else:  # Q2 & Q3
            seasonal_factor = 1.0
            
        # Generate transactions for this day
        for _ in range(daily_transactions):
            # Select a random product
            product_name = random.choice(list(products.keys()))
            product_info = products[product_name]
            
            # Select a random region
            region = random.choice(regions)
            
            # Calculate units sold with seasonal variations
            base_units = np.random.randint(1, 10)
            adjusted_units = int(base_units * seasonal_factor)
            
            # Simulate a surge in certain products during specific months
            if product_name == "Winter Jacket" and month in [10, 11, 12, 1, 2]:
                adjusted_units *= 3
            elif product_name == "Running Shoes" and month in [3, 4, 5]:
                adjusted_units *= 2
            
            # Calculate revenue (with some price variations)
            price_variation = np.random.uniform(0.9, 1.1)
            revenue = adjusted_units * product_info["base_price"] * price_variation
            
            # Simulate inventory level with some randomness
            # Start with base inventory and reduce as time goes on
            days_passed_factor = day / num_days
            inventory_depletion = product_info["base_inventory"] * days_passed_factor * 0.8
            inventory_level = max(0, int(product_info["base_inventory"] - inventory_depletion + np.random.randint(-10, 20)))
            
            # Special case: simulate low inventory for certain products in recent months
            if product_name in ["Laptop Pro", "Office Desk"] and month >= datetime.now().month - 1 and current_date.year == datetime.now().year:
                inventory_level = max(0, np.random.randint(0, 15))
            
            # Record the transaction
            dates.append(current_date.strftime("%Y-%m-%d"))
            product_names.append(product_name)
            units_sold.append(adjusted_units)
            revenues.append(round(revenue, 2))
            inventory_levels.append(inventory_level)
            categories.append(product_info["category"])
            regions_list.append(region)
    
    # Create a pandas DataFrame
    df = pd.DataFrame({
        "Date": dates,
        "Product Name": product_names,
        "Units Sold": units_sold,
        "Revenue": revenues,
        "Inventory Level": inventory_levels,
        "Category": categories,
        "Region": regions_list
    })
    
    # Save to CSV
    df.to_csv("data/sales_data.csv", index=False)
    print(f"Mock data generated and saved to data/sales_data.csv ({len(df)} records)")
    return df

if __name__ == "__main__":
    generate_mock_sales_data()
