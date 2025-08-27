import { NextResponse } from 'next/server';

// Fetch actual Railway environments using GraphQL API
export async function GET() {
  try {
    // Check if we're not in production mode
    const isNotProduction = process.env.NEXT_PUBLIC_ENV !== 'production';
    
    if (!isNotProduction) {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }
    
    // Railway API configuration
    const RAILWAY_API_TOKEN = process.env.RAILWAY_API_TOKEN;
    const RAILWAY_PROJECT_ID = process.env.RAILWAY_PROJECT_ID;
    
    if (!RAILWAY_API_TOKEN || !RAILWAY_PROJECT_ID) {
      // Return empty environments if no Railway config
      return NextResponse.json({ 
        environments: []
      });
    }
    
    // Query Railway GraphQL API
    const query = `
      query GetProjectEnvironments($projectId: String!) {
        project(id: $projectId) {
          id
          name
          environments {
            edges {
              node {
                id
                name
                deployments {
                  edges {
                    node {
                      id
                      staticUrl
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    const response = await fetch('https://backboard.railway.com/graphql/v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RAILWAY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { projectId: RAILWAY_PROJECT_ID }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Railway API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Parse Railway environments
    const environments = data.data?.project?.environments?.edges?.map((edge: any) => {
      const env = edge.node;
      const deployment = env.deployments?.edges?.[0]?.node;
      const staticUrl = deployment?.staticUrl;
      
      // Extract PR number from environment name (e.g., "pr7", "pr123")
      const prMatch = env.name.match(/pr(\d+)$/i);
      const prNumber = prMatch ? prMatch[1] : null;
      
      return {
        name: env.name,
        url: staticUrl ? `https://${staticUrl}` : null,
        prNumber,
        status: deployment ? 'active' : 'inactive'
      };
    }).filter((env: any) => env.url && env.name!=="production") || []; // Only include environments with URLs
    
    return NextResponse.json({ environments });
    
  } catch (error) {
    console.error('Failed to fetch Railway environments:', error);
    
    // Return empty environments on error
    return NextResponse.json({ 
      environments: [],
      error: 'Failed to fetch Railway environments'
    });
  }
}