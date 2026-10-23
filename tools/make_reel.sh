#!/usr/bin/env bash
# Makes an Instagram Reel from a phone video: stabilise, slow to 0.8× with motion interpolation to 60 fps,
# warm autumn grade, 1080×1920, brand titles (an .ass file), music normalised to -14 LUFS.
#
#   tools/make_reel.sh input.mp4 reels/titles.ass music.mp3 export/07-reels/name
#
# Writes name.mp4 (titles + music), name-bez-teksta.mp4, name-bez-muzyki.mp4 (titles, silent — for Instagram audio).
set -euo pipefail
IN=$1; ASS=$2; MUSIC=$3; OUT=$4
ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

ffmpeg -v error -y -i "$IN" -vf vidstabdetect=shakiness=7:accuracy=15:result="$WORK/t.trf" -f null -
ffmpeg -v error -y -i "$IN" -vf "vidstabtransform=input=$WORK/t.trf:smoothing=24:optzoom=1:zoomspeed=0.2:interpol=bicubic,unsharp=5:5:0.6:3:3:0.0" \
  -c:v libx264 -crf 14 -preset medium -an "$WORK/stab.mp4"
ffmpeg -v error -y -i "$WORK/stab.mp4" \
  -vf "setpts=1.25*PTS,minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=fdiff:scd_threshold=8,scale=1080:-2:flags=lanczos,crop=1080:1920,colorbalance=rs=0.05:gs=0.01:bs=-0.05:rm=0.04:bm=-0.04:rh=0.02:bh=-0.03,eq=contrast=1.05:saturation=1.08:gamma=0.98,vignette=angle=0.32" \
  -c:v libx264 -crf 14 -preset fast "$WORK/graded.mp4"
ffmpeg -v error -y -i "$WORK/graded.mp4" -vf "subtitles=$ASS:fontsdir=$ROOT/assets/fonts" -c:v libx264 -crf 14 -preset fast "$WORK/titled.mp4"

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WORK/graded.mp4")
FADE=$(python3 -c "print(max(0, $DUR - 1.8))")
AF="atrim=0:$DUR,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.3,afade=t=out:st=$FADE:d=1.8,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000"
VENC=(-c:v libx264 -profile:v high -level 4.2 -pix_fmt yuv420p -crf 18 -maxrate 14M -bufsize 28M -preset slow -movflags +faststart)
ffmpeg -v error -y -i "$WORK/titled.mp4" -i "$MUSIC" -filter_complex "[1:a]$AF[a]" -map 0:v -map "[a]" "${VENC[@]}" -c:a aac -b:a 192k -shortest "$OUT.mp4"
ffmpeg -v error -y -i "$WORK/graded.mp4" -i "$MUSIC" -filter_complex "[1:a]$AF[a]" -map 0:v -map "[a]" "${VENC[@]}" -c:a aac -b:a 192k -shortest "$OUT-bez-teksta.mp4"
ffmpeg -v error -y -i "$WORK/titled.mp4" -f lavfi -i anullsrc=r=48000:cl=stereo -map 0:v -map 1:a "${VENC[@]}" -c:a aac -b:a 128k -shortest "$OUT-bez-muzyki.mp4"
