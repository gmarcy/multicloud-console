/* Copyright Contributors to the Open Cluster Management project */

import {
  Cluster,
  ClusterDeployment,
  ClusterPool,
  ManagedCluster,
  ManagedClusterSet,
  managedClusterSetLabel,
  mapClusters,
} from '../../../../../resources'
import { useRecoilValue, useSharedAtoms } from '../../../../../shared-recoil'

// returns the clusters assigned to a ManagedClusterSet
export function useClusters(
  managedClusterSet: ManagedClusterSet | undefined,
  clusterPool?: ClusterPool | undefined,
  isGlobalClusterSet?: boolean
) {
  const {
    certificateSigningRequestsState,
    clusterClaimsState,
    clusterDeploymentsState,
    managedClusterAddonsState,
    clusterManagementAddonsState,
    managedClusterInfosState,
    managedClustersState,
    agentClusterInstallsState,
    clusterCuratorsState,
    hostedClustersState,
    nodePoolsState,
  } = useSharedAtoms()

  const managedClusters = useRecoilValue(managedClustersState)
  const clusterDeployments = useRecoilValue(clusterDeploymentsState)
  const managedClusterInfos = useRecoilValue(managedClusterInfosState)
  const certificateSigningRequests = useRecoilValue(certificateSigningRequestsState)
  const managedClusterAddons = useRecoilValue(managedClusterAddonsState)
  const clusterManagementAddons = useRecoilValue(clusterManagementAddonsState)
  const clusterClaims = useRecoilValue(clusterClaimsState)
  const clusterCurators = useRecoilValue(clusterCuratorsState)
  const agentClusterInstalls = useRecoilValue(agentClusterInstallsState)
  const hostedClusters = useRecoilValue(hostedClustersState)
  const nodePools = useRecoilValue(nodePoolsState)

  let groupManagedClusters: ManagedCluster[] = []
  let groupClusterDeployments: ClusterDeployment[] = []

  if (managedClusterSet || isGlobalClusterSet === true) {
    groupManagedClusters =
      isGlobalClusterSet === true
        ? managedClusters
        : managedClusters.filter(
            (mc) => mc.metadata.labels?.[managedClusterSetLabel] === managedClusterSet?.metadata.name
          )
    groupClusterDeployments = clusterDeployments.filter(
      (cd) =>
        cd.metadata.labels?.[managedClusterSetLabel] === managedClusterSet?.metadata.name ||
        groupManagedClusters.find((mc) => mc.metadata.name === cd.metadata.namespace)
    )

    // prevent the unclaimed clusters from showing up in cluster set clusters
    groupClusterDeployments = groupClusterDeployments.filter((cd) => {
      if (cd.spec?.clusterPoolRef?.poolName !== undefined) {
        return cd.spec?.clusterPoolRef?.claimName !== undefined
      } else {
        return true
      }
    })
  }

  if (clusterPool) {
    groupClusterDeployments = clusterDeployments.filter(
      (cd) =>
        cd.spec?.clusterPoolRef?.claimName === undefined &&
        cd.spec?.clusterPoolRef?.poolName === clusterPool.metadata.name &&
        cd.spec?.clusterPoolRef?.namespace === clusterPool.metadata.namespace
    )
    groupManagedClusters = managedClusters.filter((mc) =>
      groupClusterDeployments.find((cd) => mc.metadata.name === cd.metadata.name)
    )
  }

  const clusterNames = Array.from(
    new Set([
      ...groupManagedClusters.map((mc) => mc.metadata.name),
      ...groupClusterDeployments.map((cd) => cd.metadata.name),
    ])
  )
  const groupManagedClusterInfos = managedClusterInfos.filter((mci) => clusterNames.includes(mci.metadata.namespace))

  const groupHostedClusters = hostedClusters.filter((hc) => clusterNames.includes(hc.metadata?.name))

  const clusters: Cluster[] = mapClusters(
    groupClusterDeployments,
    groupManagedClusterInfos,
    certificateSigningRequests,
    groupManagedClusters,
    managedClusterAddons,
    clusterManagementAddons,
    clusterClaims,
    clusterCurators,
    agentClusterInstalls,
    groupHostedClusters,
    nodePools
  )

  return clusters
}
