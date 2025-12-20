ssh user@your-server-ip

root@160.251.237.190

scp scripts/setup-vps.sh root@160.251.237.190:~/

HTTPS がまだとっていない。ここから取得。
sudo certbot --nginx -d zoom.katsun.info
nslookup -type=NS katsun.info 8.8.8.8
nslookup -type=NS katsun.info 01.dnsv.jp
nslookup -type=A zoom.katsun.info 01.dnsv.jp

psql -U miji -d zoom_stats -h localhost

# テーブル一覧を確認

\dt

# participant_stats テーブルの構造を確認

\d participant_stats

# room_overall_stats テーブルの構造を確認

\d room_overall_stats

# データ件数を確認

SELECT COUNT(_) FROM participant_stats;
SELECT COUNT(_) FROM room_overall_stats;

# 最新のデータを確認（あれば）

SELECT _ FROM participant_stats ORDER BY recorded_at DESC LIMIT 5;
SELECT _ FROM room_overall_stats ORDER BY recorded_at DESC LIMIT 5;
