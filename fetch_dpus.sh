
#!/bin/bash

# Taken from https://gist.github.com/marcbowes/c71012c4e51fdf9b1bc3352bf35d7561
# See https://awsfundamentals.com/blog/amazon-dsql-pricing-guide

set -euo pipefail

shopt -s failglob

# Check if cluster ID is provided
if [ $# -ne 1 ]; then
    echo "Usage: $0 <cluster-id>"
    exit 1
fi

CLUSTER_ID=$1
END_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Set start time to first day of current month
START_TIME=$(date -u +"%Y-%m-01T00:00:00Z")
# For storage metrics, use last hour
STORAGE_START_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ" -d "1 hour ago" 2>/dev/null || date -u -v-1H +"%Y-%m-%dT%H:%M:%SZ")

echo "Fetching metrics for cluster $CLUSTER_ID for the current month..."
echo "Time range: $START_TIME to $END_TIME"

# Get storage size from CloudWatch metrics - use the most recent datapoint
STORAGE_SIZE_BYTES=$(aws cloudwatch get-metric-statistics \
    --namespace "AWS/AuroraDSQL" \
    --metric-name "ClusterStorageSize" \
    --dimensions Name=ClusterId,Value=$CLUSTER_ID \
    --start-time "$STORAGE_START_TIME" \
    --end-time "$END_TIME" \
    --period 60 \
    --statistics Average \
    --output json | jq -r '.Datapoints | sort_by(.Timestamp) | last | .Average // "N/A"')

# Convert bytes to GB for display and cost calculation
if [[ "$STORAGE_SIZE_BYTES" != "N/A" ]]; then
    # Convert bytes to GB (1 GB = 1,000,000,000 bytes) - decimal system
    STORAGE_SIZE_GB=$(echo "scale=6; $STORAGE_SIZE_BYTES / 1000000000" | bc)
    # Format for display
    STORAGE_SIZE_DISPLAY=$(echo "$STORAGE_SIZE_BYTES" | awk '{
        if ($1 < 1000) { printf "%.2f B", $1 }
        else if ($1 < 1000000) { printf "%.2f KB", $1/1000 }
        else if ($1 < 1000000000) { printf "%.2f MB", $1/1000000 }
        else { printf "%.2f GB", $1/1000000000 }
    }')
else
    STORAGE_SIZE_GB="N/A"
    STORAGE_SIZE_DISPLAY="N/A"
fi

# Get TotalDPU sum for the entire month - use 1 day period to avoid exceeding datapoints limit
TOTAL_DPU=$(aws cloudwatch get-metric-statistics \
    --namespace "AWS/AuroraDSQL" \
    --metric-name "TotalDPU" \
    --dimensions Name=ClusterId,Value=$CLUSTER_ID \
    --start-time "$START_TIME" \
    --end-time "$END_TIME" \
    --period 86400 \
    --statistics Sum \
    --output json)

# Extract and sum all datapoints
DPU_SUM=$(echo $TOTAL_DPU | jq -r '.Datapoints[].Sum' | awk '{sum+=$1} END {printf "%.6f", sum}')

# Get breakdown of DPU types for the entire month
COMPUTE_DPU=$(aws cloudwatch get-metric-statistics \
    --namespace "AWS/AuroraDSQL" \
    --metric-name "ComputeDPU" \
    --dimensions Name=ClusterId,Value=$CLUSTER_ID \
    --start-time "$START_TIME" \
    --end-time "$END_TIME" \
    --period 86400 \
    --statistics Sum \
    --output json | jq -r '.Datapoints[].Sum' | awk '{sum+=$1} END {printf "%.6f", sum}')

READ_DPU=$(aws cloudwatch get-metric-statistics \
    --namespace "AWS/AuroraDSQL" \
    --metric-name "ReadDPU" \
    --dimensions Name=ClusterId,Value=$CLUSTER_ID \
    --start-time "$START_TIME" \
    --end-time "$END_TIME" \
    --period 86400 \
    --statistics Sum \
    --output json | jq -r '.Datapoints[].Sum' | awk '{sum+=$1} END {printf "%.6f", sum}')

WRITE_DPU=$(aws cloudwatch get-metric-statistics \
    --namespace "AWS/AuroraDSQL" \
    --metric-name "WriteDPU" \
    --dimensions Name=ClusterId,Value=$CLUSTER_ID \
    --start-time "$START_TIME" \
    --end-time "$END_TIME" \
    --period 86400 \
    --statistics Sum \
    --output json | jq -r '.Datapoints[].Sum' | awk '{sum+=$1} END {printf "%.6f", sum}')

# Calculate costs
DPU_COST=$(echo "scale=4; $DPU_SUM * 8 / 1000000" | bc)

# Calculate storage cost if available
if [[ "$STORAGE_SIZE_GB" != "N/A" ]]; then
    STORAGE_COST_MONTHLY=$(echo "scale=4; $STORAGE_SIZE_GB * 0.33" | bc)
else
    STORAGE_COST_MONTHLY="N/A"
fi

echo "======= Cluster Summary ======="
echo "Cluster ID:      $CLUSTER_ID"
echo "Storage Size:    $STORAGE_SIZE_DISPLAY"
echo ""
echo "======= DPU Usage Summary (Month to Date) ======="
echo "Total DPU (Sum): $DPU_SUM DPUs"
echo "  - Compute DPU: $COMPUTE_DPU DPUs"
echo "  - Read DPU:    $READ_DPU DPUs"
echo "  - Write DPU:   $WRITE_DPU DPUs"
echo ""
echo "======= Cost Estimate ======="
echo "DPU Cost:        \$$DPU_COST (at \$8.00 per 1M DPU units)"
if [[ "$STORAGE_SIZE_GB" != "N/A" && "$STORAGE_COST_MONTHLY" != "N/A" ]]; then
    echo "Storage Cost:    \$$STORAGE_COST_MONTHLY (monthly)"
    TOTAL_MONTHLY=$(echo "scale=4; $STORAGE_COST_MONTHLY + $DPU_COST" | bc)
    echo "Total Monthly:   \$$TOTAL_MONTHLY"
else
    echo "Storage Cost:    N/A (storage size not available)"
fi
echo "=============================="
