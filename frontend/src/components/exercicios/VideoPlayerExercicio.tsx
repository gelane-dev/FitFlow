import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet } from 'react-native';

import { cores, raios } from '@/theme';

type VideoPlayerExercicioProps = {
  uri: string;
};

export function VideoPlayerExercicio({
  uri,
}: VideoPlayerExercicioProps) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = true;
  });

  return (
    <VideoView
      style={styles.playerVideo}
      player={player}
      contentFit="contain"
      nativeControls
    />
  );
}

const styles = StyleSheet.create({
  playerVideo: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: raios.cartao,
    backgroundColor: cores.superficieElevada,
    overflow: 'hidden',
  },
});
