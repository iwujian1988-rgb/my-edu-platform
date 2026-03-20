/**
 * 无权限访问提示组件
 *
 * 当用户没有视频访问权限时显示，引导购买套餐
 */

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lock, Package, Clock } from 'lucide-react'
import Link from 'next/link'
import type { VideoPackage } from '@/types/video'

interface AccessDeniedProps {
  packages: VideoPackage[]
  videoTitle: string
}

export function AccessDenied({ packages, videoTitle }: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* 锁图标 */}
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <Lock className="w-10 h-10 text-muted-foreground" />
      </div>

      {/* 提示文字 */}
      <h2 className="text-xl font-bold mb-2">需要开通会员</h2>
      <p className="text-muted-foreground text-center mb-6 max-w-md">
        观看「{videoTitle}」需要开通对应的学习套餐
      </p>

      {/* 推荐套餐 */}
      {packages.length > 0 ? (
        <div className="w-full max-w-lg space-y-3">
          <p className="text-sm text-muted-foreground mb-3">推荐套餐：</p>
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">{pkg.name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {pkg.video_count} 个视频
                    </Badge>
                    {pkg.duration_days && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {pkg.duration_days} 天
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">¥{pkg.price}</p>
                <Button size="sm" asChild>
                  <Link href={`/packages/${pkg.id}`}>购买</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            暂无可用套餐，请联系客服
          </p>
        </div>
      )}

      {/* 查看全部套餐 */}
      <Button variant="outline" className="mt-6" asChild>
        <Link href="/video-packages">
          查看全部套餐
        </Link>
      </Button>
    </div>
  )
}
