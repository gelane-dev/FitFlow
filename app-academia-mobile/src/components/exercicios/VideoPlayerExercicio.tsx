import { StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

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
    height: 220,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    marginBottom: 12,
  },
});
